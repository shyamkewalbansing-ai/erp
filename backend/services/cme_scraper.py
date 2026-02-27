"""
CME.sr Wisselkoers Scraper
==========================
Haalt actuele wisselkoersen op van Central Money Exchange Suriname
"""

import httpx
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from typing import Dict, List, Optional
import re
import logging

logger = logging.getLogger(__name__)

CME_URL = "https://www.cme.sr/"

async def fetch_cme_exchange_rates() -> Dict:
    """
    Haalt wisselkoersen op van CME.sr
    
    Returns:
        Dict met koersen in formaat:
        {
            "success": True/False,
            "timestamp": "2024-12-27T15:30:00",
            "source": "CME.sr",
            "rates": {
                "USD_SRD": {"inkoop": 37.60, "verkoop": 37.85},
                "EUR_SRD": {"inkoop": 43.00, "verkoop": 43.60},
                "EUR_USD": {"inkoop": 1.1265, "verkoop": 1.1400}
            },
            "last_updated": "27-Feb-2026 03:38 PM"
        }
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(CME_URL, follow_redirects=True)
            response.raise_for_status()
            
        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        rates = {
            "USD_SRD": {"inkoop": None, "verkoop": None},
            "EUR_SRD": {"inkoop": None, "verkoop": None},
            "EUR_USD": {"inkoop": None, "verkoop": None}
        }
        
        # Zoek naar de Cash Rate sectie
        # De structuur is: "1 USD = XX.XX SRD" in verschillende secties
        
        # Methode 1: Zoek via tekst patterns
        text = soup.get_text()
        
        # USD inkoop (We Buy sectie)
        usd_buy_match = re.search(r'We Buy:.*?1 USD\s*=\s*(\d+\.?\d*)\s*SRD', text, re.DOTALL | re.IGNORECASE)
        if usd_buy_match:
            rates["USD_SRD"]["inkoop"] = float(usd_buy_match.group(1))
        
        # EUR inkoop
        eur_buy_match = re.search(r'We Buy:.*?1 EURO\s*=\s*(\d+\.?\d*)\s*SRD', text, re.DOTALL | re.IGNORECASE)
        if eur_buy_match:
            rates["EUR_SRD"]["inkoop"] = float(eur_buy_match.group(1))
        
        # USD verkoop (We Sell sectie)
        usd_sell_match = re.search(r'We Sell:.*?1 USD\s*=\s*(\d+\.?\d*)\s*SRD', text, re.DOTALL | re.IGNORECASE)
        if usd_sell_match:
            rates["USD_SRD"]["verkoop"] = float(usd_sell_match.group(1))
        
        # EUR verkoop
        eur_sell_match = re.search(r'We Sell:.*?1 EURO\s*=\s*(\d+\.?\d*)\s*SRD', text, re.DOTALL | re.IGNORECASE)
        if eur_sell_match:
            rates["EUR_SRD"]["verkoop"] = float(eur_sell_match.group(1))
        
        # EUR/USD Treasury rates
        eur_usd_match = re.search(r'EURO to USD\s*=\s*(\d+\.?\d*)', text, re.IGNORECASE)
        if eur_usd_match:
            rates["EUR_USD"]["inkoop"] = float(eur_usd_match.group(1))
        
        usd_eur_match = re.search(r'USD to EURO\s*=\s*(\d+\.?\d*)', text, re.IGNORECASE)
        if usd_eur_match:
            rates["EUR_USD"]["verkoop"] = float(usd_eur_match.group(1))
        
        # Zoek laatste update tijd
        last_updated_match = re.search(r'Last updated.*?on\s*(\d{1,2}-\w{3}-\d{4}\s+\d{1,2}:\d{2}\s*[AP]M)', text, re.IGNORECASE)
        last_updated = last_updated_match.group(1) if last_updated_match else None
        
        # Valideer dat we tenminste USD en EUR koersen hebben
        if rates["USD_SRD"]["inkoop"] is None or rates["EUR_SRD"]["inkoop"] is None:
            # Fallback: probeer alternatieve parsing
            rates = await _parse_alternative(soup, rates)
        
        return {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "CME.sr",
            "rates": rates,
            "last_updated": last_updated
        }
        
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching CME rates: {e}")
        return {
            "success": False,
            "error": f"Kon CME.sr niet bereiken: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error parsing CME rates: {e}")
        return {
            "success": False,
            "error": f"Fout bij verwerken koersen: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


async def _parse_alternative(soup: BeautifulSoup, rates: Dict) -> Dict:
    """
    Alternatieve parsing methode voor CME.sr
    Zoekt naar specifieke HTML elementen
    """
    try:
        # Zoek alle elementen met koers informatie
        # CME gebruikt vaak spans of divs met specifieke classes
        
        # Zoek naar elementen die getallen bevatten na "USD" of "EURO"
        for element in soup.find_all(['span', 'div', 'td', 'p']):
            text = element.get_text(strip=True)
            
            # USD koers pattern
            if 'USD' in text and 'SRD' in text:
                match = re.search(r'(\d+\.?\d*)\s*SRD', text)
                if match:
                    value = float(match.group(1))
                    if value > 30 and value < 50:  # Redelijke range voor USD/SRD
                        if rates["USD_SRD"]["inkoop"] is None:
                            rates["USD_SRD"]["inkoop"] = value
                        elif rates["USD_SRD"]["verkoop"] is None and value != rates["USD_SRD"]["inkoop"]:
                            rates["USD_SRD"]["verkoop"] = value
            
            # EUR koers pattern
            if ('EURO' in text or 'EUR' in text) and 'SRD' in text:
                match = re.search(r'(\d+\.?\d*)\s*SRD', text)
                if match:
                    value = float(match.group(1))
                    if value > 35 and value < 60:  # Redelijke range voor EUR/SRD
                        if rates["EUR_SRD"]["inkoop"] is None:
                            rates["EUR_SRD"]["inkoop"] = value
                        elif rates["EUR_SRD"]["verkoop"] is None and value != rates["EUR_SRD"]["inkoop"]:
                            rates["EUR_SRD"]["verkoop"] = value
    
    except Exception as e:
        logger.warning(f"Alternative parsing failed: {e}")
    
    return rates


def format_rate_for_display(rates: Dict) -> List[Dict]:
    """
    Formatteert de koersen voor weergave in de frontend
    """
    result = []
    
    if rates.get("USD_SRD"):
        if rates["USD_SRD"].get("inkoop"):
            result.append({
                "valuta_van": "USD",
                "valuta_naar": "SRD",
                "type": "inkoop",
                "koers": rates["USD_SRD"]["inkoop"],
                "label": "USD → SRD (Inkoop)"
            })
        if rates["USD_SRD"].get("verkoop"):
            result.append({
                "valuta_van": "USD",
                "valuta_naar": "SRD",
                "type": "verkoop",
                "koers": rates["USD_SRD"]["verkoop"],
                "label": "USD → SRD (Verkoop)"
            })
    
    if rates.get("EUR_SRD"):
        if rates["EUR_SRD"].get("inkoop"):
            result.append({
                "valuta_van": "EUR",
                "valuta_naar": "SRD",
                "type": "inkoop",
                "koers": rates["EUR_SRD"]["inkoop"],
                "label": "EUR → SRD (Inkoop)"
            })
        if rates["EUR_SRD"].get("verkoop"):
            result.append({
                "valuta_van": "EUR",
                "valuta_naar": "SRD",
                "type": "verkoop",
                "koers": rates["EUR_SRD"]["verkoop"],
                "label": "EUR → SRD (Verkoop)"
            })
    
    if rates.get("EUR_USD"):
        if rates["EUR_USD"].get("inkoop"):
            result.append({
                "valuta_van": "EUR",
                "valuta_naar": "USD",
                "type": "inkoop",
                "koers": rates["EUR_USD"]["inkoop"],
                "label": "EUR → USD"
            })
    
    return result
