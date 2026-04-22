"""Superadmin — Custom Domain Wizard

Centraal beheer van custom domains per bedrijf:
- Lijst alle bedrijven met custom_domain + DNS/SSL status
- Koppel / wijzig / verwijder custom_domain voor een bedrijf
- Genereer exact copy-paste klare nginx server block + certbot commando's
- Verifieer DNS en SSL status
"""
from .base import *
from .superadmin import get_superadmin
import socket
import ssl as _ssl
import asyncio
import dns.resolver


# ============== MODELS ==============

class DomainAssign(BaseModel):
    company_id: str
    custom_domain: str  # e.g. "dadovastgoed.kewalbansing.net"
    landing: str = "kiosk"  # "kiosk" | "login"


class DomainCommandRequest(BaseModel):
    main_domain: str  # primary domain, e.g. "facturatie.sr"
    include_www: bool = True  # include www.<main>
    additional_domains: list[str] = []  # other subdomeinen om mee te nemen in expand
    email: str = "admin@facturatie.sr"  # certbot registration email
    backend_port: int = 8001  # FastAPI port
    frontend_port: int = 3000  # React build / nginx root


# ============== LIST ==============

@router.get("/superadmin/domains")
async def sa_list_domains(admin=Depends(get_superadmin)):
    """All companies that have a custom_domain configured."""
    companies = await db.kiosk_companies.find(
        {"custom_domain": {"$nin": [None, ""]}},
        {"_id": 0, "company_id": 1, "name": 1, "custom_domain": 1,
         "custom_domain_landing": 1, "main_app_domain": 1, "updated_at": 1}
    ).to_list(500)
    return companies


@router.get("/superadmin/companies-without-domain")
async def sa_list_companies_without_domain(admin=Depends(get_superadmin)):
    """Companies that do NOT yet have a custom_domain — for the wizard dropdown."""
    companies = await db.kiosk_companies.find(
        {"$or": [{"custom_domain": None}, {"custom_domain": ""}, {"custom_domain": {"$exists": False}}]},
        {"_id": 0, "company_id": 1, "name": 1, "email": 1}
    ).to_list(500)
    return companies


# ============== ASSIGN / UPDATE / REMOVE ==============

@router.post("/superadmin/domains/assign")
async def sa_assign_domain(data: DomainAssign, admin=Depends(get_superadmin)):
    """Assign / update a custom_domain to a company."""
    cd = data.custom_domain.strip().lower()
    if not cd:
        raise HTTPException(status_code=400, detail="Domein mag niet leeg zijn")
    if cd.startswith("http://") or cd.startswith("https://"):
        raise HTTPException(status_code=400, detail="Voer alleen de hostnaam in (zonder http://)")
    if "/" in cd or " " in cd:
        raise HTTPException(status_code=400, detail="Ongeldig domein")
    if data.landing not in ("kiosk", "login"):
        raise HTTPException(status_code=400, detail="Landing moet 'kiosk' of 'login' zijn")

    # Check of domein al in gebruik is door ander bedrijf
    existing = await db.kiosk_companies.find_one(
        {"custom_domain": cd, "company_id": {"$ne": data.company_id}},
        {"_id": 0, "name": 1, "company_id": 1}
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Domein '{cd}' is al gekoppeld aan '{existing['name']}'"
        )

    comp = await db.kiosk_companies.find_one({"company_id": data.company_id})
    if not comp:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")

    await db.kiosk_companies.update_one(
        {"company_id": data.company_id},
        {"$set": {
            "custom_domain": cd,
            "custom_domain_landing": data.landing,
            "updated_at": datetime.now(timezone.utc),
        }}
    )
    return {"ok": True, "company_id": data.company_id, "custom_domain": cd}


@router.delete("/superadmin/domains/{company_id}")
async def sa_remove_domain(company_id: str, admin=Depends(get_superadmin)):
    """Remove custom_domain from a company."""
    result = await db.kiosk_companies.update_one(
        {"company_id": company_id},
        {"$set": {"custom_domain": "", "custom_domain_landing": "kiosk",
                  "updated_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bedrijf niet gevonden")
    return {"ok": True}


# ============== VERIFY (DNS + SSL) ==============

@router.get("/superadmin/domains/verify")
async def sa_verify_domain(domain: str, admin=Depends(get_superadmin)):
    """DNS + SSL check voor een willekeurig domein (wizard gebruikt dit)."""
    domain = domain.strip().lower()
    if not domain:
        raise HTTPException(status_code=400, detail="Geen domein opgegeven")

    result = {"domain": domain, "dns": {"status": "unknown", "details": []},
              "ssl": {"status": "unknown", "details": []}, "ip": None, "cname": None}

    # DNS
    try:
        try:
            answers = dns.resolver.resolve(domain, 'CNAME')
            result["cname"] = str(answers[0].target).rstrip('.')
            result["dns"]["status"] = "ok"
            result["dns"]["details"].append(f"CNAME → {result['cname']}")
        except dns.resolver.NoAnswer:
            pass
        except dns.resolver.NXDOMAIN:
            result["dns"]["status"] = "not_found"
            result["dns"]["details"].append("Domein bestaat niet (NXDOMAIN)")
            return result

        try:
            answers = dns.resolver.resolve(domain, 'A')
            result["ip"] = str(answers[0])
            if result["dns"]["status"] == "unknown":
                result["dns"]["status"] = "ok"
            result["dns"]["details"].append(f"A-record → {result['ip']}")
        except Exception:
            if result["dns"]["status"] == "unknown":
                result["dns"]["status"] = "pending"
                result["dns"]["details"].append("Geen A-record gevonden")
    except Exception as e:
        result["dns"]["status"] = "error"
        result["dns"]["details"].append(f"DNS fout: {str(e)[:120]}")

    # SSL
    try:
        loop = asyncio.get_event_loop()

        def check_ssl():
            ctx = _ssl.create_default_context()
            with ctx.wrap_socket(socket.socket(), server_hostname=domain) as s:
                s.settimeout(8)
                s.connect((domain, 443))
                return s.getpeercert()

        cert = await asyncio.wait_for(loop.run_in_executor(None, check_ssl), timeout=12)
        from datetime import datetime as _dt
        not_after = cert.get("notAfter", "")
        expiry = _dt.strptime(not_after, "%b %d %H:%M:%S %Y %Z") if not_after else None
        days_left = (expiry - _dt.utcnow()).days if expiry else 0

        san = cert.get("subjectAltName", [])
        cert_domains = [d[1] for d in san if d[0] == 'DNS']
        domain_match = any(
            domain == cd or (cd.startswith('*.') and domain.endswith(cd[1:]))
            for cd in cert_domains
        )

        if not domain_match:
            result["ssl"]["status"] = "mismatch"
            result["ssl"]["details"].append(f"Certificaat dekt '{domain}' NIET")
            result["ssl"]["details"].append(f"Dekt wel: {', '.join(cert_domains[:5])}")
        elif days_left <= 0:
            result["ssl"]["status"] = "expired"
            result["ssl"]["details"].append("Certificaat verlopen")
        elif days_left <= 30:
            result["ssl"]["status"] = "expiring"
            result["ssl"]["details"].append(f"Verloopt over {days_left} dagen")
        else:
            result["ssl"]["status"] = "valid"
            result["ssl"]["details"].append(f"Geldig, {days_left} dagen resterend")
    except (socket.timeout, asyncio.TimeoutError):
        result["ssl"]["status"] = "timeout"
        result["ssl"]["details"].append("Poort 443 time-out")
    except _ssl.SSLCertVerificationError:
        result["ssl"]["status"] = "mismatch"
        result["ssl"]["details"].append(f"Certificaat dekt '{domain}' niet")
    except ConnectionRefusedError:
        result["ssl"]["status"] = "unavailable"
        result["ssl"]["details"].append("Poort 443 geweigerd")
    except (socket.gaierror, OSError):
        result["ssl"]["status"] = "unavailable"
        result["ssl"]["details"].append("Kan geen verbinding maken")
    except Exception as e:
        result["ssl"]["status"] = "error"
        result["ssl"]["details"].append(f"SSL fout: {str(e)[:120]}")

    return result


# ============== COMMAND GENERATOR ==============

@router.post("/superadmin/domains/generate-commands")
async def sa_generate_commands(data: DomainCommandRequest, admin=Depends(get_superadmin)):
    """Genereer kant-en-klare nginx + certbot commando's op basis van alle
    huidige custom_domains van alle bedrijven + optioneel extra domeinen.
    De hoofdagent kan deze commando's direct kopiëren en plakken op productieserver.
    """
    main = data.main_domain.strip().lower()
    if not main:
        raise HTTPException(status_code=400, detail="Hoofd domein is verplicht")

    # Verzamel alle custom_domains
    companies = await db.kiosk_companies.find(
        {"custom_domain": {"$nin": [None, ""]}},
        {"_id": 0, "custom_domain": 1, "name": 1, "company_id": 1}
    ).to_list(500)

    custom_domains = []
    seen = {main}
    for c in companies:
        cd = (c.get("custom_domain") or "").strip().lower()
        if cd and cd not in seen:
            custom_domains.append({"domain": cd, "company": c.get("name", ""),
                                   "company_id": c.get("company_id", "")})
            seen.add(cd)

    # Extra domeinen uit request
    for extra in (data.additional_domains or []):
        ed = extra.strip().lower()
        if ed and ed not in seen:
            custom_domains.append({"domain": ed, "company": "(handmatig toegevoegd)",
                                   "company_id": ""})
            seen.add(ed)

    # Alle domeinen voor certbot -d flags
    all_domains = [main]
    if data.include_www:
        all_domains.append(f"www.{main}")
    all_domains.extend([d["domain"] for d in custom_domains])

    # 1. Certbot --expand command (bestaand certificaat uitbreiden)
    certbot_d_flags = " \\\n  ".join([f"-d {d}" for d in all_domains])
    certbot_cmd = f"""sudo certbot --nginx \\
  {certbot_d_flags} \\
  --expand \\
  --non-interactive \\
  --agree-tos \\
  --email {data.email}"""

    # 2. Certbot renew dry-run
    renew_cmd = "sudo certbot renew --dry-run"

    # 3. Nginx server_name regel
    nginx_server_names = " ".join(all_domains)

    # 4. Compleet nginx server block (template)
    nginx_block = f"""# /etc/nginx/sites-available/{main}
server {{
    listen 80;
    listen [::]:80;
    server_name {nginx_server_names};

    # ACME challenge voor Let's Encrypt
    location /.well-known/acme-challenge/ {{
        root /var/www/certbot;
    }}

    # HTTP → HTTPS redirect
    location / {{
        return 301 https://$host$request_uri;
    }}
}}

server {{
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name {nginx_server_names};

    # SSL cert (wordt aangemaakt/ge-updatet door certbot)
    ssl_certificate /etc/letsencrypt/live/{main}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{main}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;

    # File upload size
    client_max_body_size 50M;

    # Backend API (FastAPI)
    location /api/ {{
        proxy_pass http://127.0.0.1:{data.backend_port};
        proxy_read_timeout 120s;
    }}

    # Frontend (React build of dev server)
    location / {{
        proxy_pass http://127.0.0.1:{data.frontend_port};
        proxy_read_timeout 60s;
    }}
}}"""

    # 5. DNS instructies per custom domain
    dns_instructions = []
    for d in custom_domains:
        dns_instructions.append({
            "domain": d["domain"],
            "company": d["company"],
            "records": [
                {"type": "CNAME", "host": d["domain"], "value": main, "ttl": 300,
                 "note": "Als je subdomein bij aparte DNS-provider staat, gebruik CNAME"},
                {"type": "A", "host": d["domain"], "value": "SERVER_IP_HIER", "ttl": 300,
                 "note": "Of gebruik A-record met het IP van je productieserver"},
            ]
        })

    # 6. Stappen samenvatting
    steps = [
        {
            "step": 1,
            "title": "DNS configureren (eenmalig per domein)",
            "description": "Zorg dat elk custom domein via CNAME of A-record naar jouw productieserver wijst.",
            "commands": [f"dig +short {d['domain']}" for d in custom_domains] or ["# Geen custom domeinen ingesteld"],
        },
        {
            "step": 2,
            "title": "Nginx config plaatsen",
            "description": f"Schrijf onderstaand blok naar /etc/nginx/sites-available/{main} (overschrijf bestaand) en symlink naar sites-enabled.",
            "commands": [
                f"sudo tee /etc/nginx/sites-available/{main} > /dev/null << 'NGINX_EOF'\n{nginx_block}\nNGINX_EOF",
                f"sudo ln -sf /etc/nginx/sites-available/{main} /etc/nginx/sites-enabled/{main}",
                "sudo nginx -t",
                "sudo systemctl reload nginx",
            ],
        },
        {
            "step": 3,
            "title": "SSL certificaat uitbreiden",
            "description": "Voegt alle domeinen toe aan je bestaande Let's Encrypt certificaat.",
            "commands": [certbot_cmd],
        },
        {
            "step": 4,
            "title": "Verifieer auto-renewal",
            "description": "Zorg dat certificaten automatisch hernieuwd worden.",
            "commands": [renew_cmd, "sudo systemctl list-timers | grep certbot"],
        },
    ]

    return {
        "main_domain": main,
        "all_domains": all_domains,
        "custom_domains": custom_domains,
        "nginx_server_name": nginx_server_names,
        "nginx_block": nginx_block,
        "certbot_command": certbot_cmd,
        "renew_command": renew_cmd,
        "dns_instructions": dns_instructions,
        "steps": steps,
    }


# ============== NGINX CONFIG ANALYZER ==============

class NginxConfigAnalyze(BaseModel):
    config_text: str  # raw inhoud van /etc/nginx/sites-enabled/facturatie.conf
    main_domain: str = "facturatie.sr"


def _parse_server_blocks(config: str):
    """Parse nginx config text and return list of server blocks with line numbers
    and extracted server_name values."""
    import re
    blocks = []
    lines = config.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        # Detect "server {" start (with possible whitespace, may be on same line as open brace)
        if re.match(r'^\s*server\s*\{?\s*$', stripped) or stripped == "server":
            start = i
            depth = 0
            # Find opening brace (may be on next line)
            found_open = "{" in line
            j = i
            while j < len(lines):
                depth += lines[j].count("{") - lines[j].count("}")
                if "{" in lines[j]:
                    found_open = True
                if found_open and depth == 0:
                    end = j
                    break
                j += 1
            else:
                break
            block_text = "\n".join(lines[start:end + 1])
            # Extract server_name
            sn_match = re.search(r'^\s*server_name\s+([^;]+);', block_text, re.MULTILINE)
            server_names = []
            if sn_match:
                server_names = sn_match.group(1).split()
            # Detect if HTTPS
            is_https = "listen" in block_text and ("443" in block_text or "ssl" in block_text)
            is_http = re.search(r'listen\s+(\[::\]:)?80\b', block_text) is not None
            blocks.append({
                "start_line": start + 1,
                "end_line": end + 1,
                "server_names": server_names,
                "is_https": is_https,
                "is_http": is_http,
                "text": block_text,
                "server_name_line": sn_match.start() if sn_match else -1,
                "server_name_match": sn_match.group(0) if sn_match else None,
            })
            i = end + 1
        else:
            i += 1
    return blocks


@router.post("/superadmin/domains/analyze-nginx-config")
async def sa_analyze_nginx_config(data: NginxConfigAnalyze, admin=Depends(get_superadmin)):
    """Parse de geplakte nginx config, vergelijk met alle huidige custom_domains,
    en geef terug welke regels gewijzigd moeten worden."""
    config = data.config_text
    if not config.strip():
        raise HTTPException(status_code=400, detail="Config is leeg")

    main = data.main_domain.strip().lower()

    # Verzamel alle benodigde domeinen
    companies = await db.kiosk_companies.find(
        {"custom_domain": {"$nin": [None, ""]}},
        {"_id": 0, "custom_domain": 1, "name": 1}
    ).to_list(500)

    required_domains = {main, f"www.{main}"}
    for c in companies:
        cd = (c.get("custom_domain") or "").strip().lower()
        if cd:
            required_domains.add(cd)

    blocks = _parse_server_blocks(config)
    if not blocks:
        raise HTTPException(status_code=400, detail="Geen 'server { ... }' blokken gevonden — is dit wel een nginx config?")

    # Analyseer elk block
    analysis = []
    overall_missing = set(required_domains)
    for b in blocks:
        present = set(n.lower() for n in b["server_names"])
        missing = required_domains - present
        overall_missing -= present  # als een block alles al heeft, geen actie
        analysis.append({
            "start_line": b["start_line"],
            "end_line": b["end_line"],
            "is_https": b["is_https"],
            "is_http": b["is_http"],
            "label": "HTTPS (443)" if b["is_https"] else ("HTTP (80)" if b["is_http"] else "onbekend"),
            "current_server_names": b["server_names"],
            "missing": sorted(list(missing)),
            "ok": len(missing) == 0,
        })

    # Genereer voorgestelde nieuwe config met aangepaste server_name regels
    import re
    new_config = config
    changes = []  # list of {old_line, new_line, line_number}

    # Vervang server_name regels in alle blokken die relevant zijn (HTTP/HTTPS)
    for b in blocks:
        if not (b["is_http"] or b["is_https"]):
            continue
        current = b["server_names"]
        current_set = set(n.lower() for n in current)
        if required_domains <= current_set:
            continue  # al volledig
        merged = list(current) + [d for d in sorted(required_domains) if d not in current_set]
        new_sn_line = "    server_name " + " ".join(merged) + ";"

        if b["server_name_match"]:
            # Escape voor regex vervang
            old_line = b["server_name_match"]
            new_config = new_config.replace(old_line, new_sn_line, 1)
            changes.append({
                "old": old_line.strip(),
                "new": new_sn_line.strip(),
                "block_label": "HTTPS (443)" if b["is_https"] else "HTTP (80)",
                "block_start_line": b["start_line"],
            })

    # Genereer diff (unified-style)
    import difflib
    diff_lines = list(difflib.unified_diff(
        config.split("\n"),
        new_config.split("\n"),
        fromfile="huidige config",
        tofile="nieuwe config",
        lineterm="",
        n=2,
    ))

    return {
        "main_domain": main,
        "required_domains": sorted(list(required_domains)),
        "blocks_found": len(blocks),
        "analysis": analysis,
        "changes": changes,
        "missing_domains": sorted(list(overall_missing)),
        "all_domains_covered": len(overall_missing) == 0,
        "new_config": new_config,
        "diff": "\n".join(diff_lines),
        "install_cert_command": f"sudo certbot install --cert-name {main}-0002  # of zonder -0002 afhankelijk van welke cert-name je hebt",
        "reload_command": "sudo nginx -t && sudo systemctl reload nginx",
    }
