"""
CME.sr Wisselkoers Scraper
==========================
Haalt actuele wisselkoersen op van Central Money Exchange Suriname
Gebruikt Playwright voor JavaScript rendering
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional
import re
import logging

logger = logging.getLogger(__name__)

CME_URL = "https://www.cme.sr/"


async def fetch_cme_exchange_rates() -> Dict:
    """
    Haalt wisselkoersen op van CME.sr met Playwright voor JavaScript rendering
    
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
        from playwright.async_api import async_playwright
        
        rates = {
            "USD_SRD": {"inkoop": None, "verkoop": None},
            "EUR_SRD": {"inkoop": None, "verkoop": None},
            "EUR_USD": {"inkoop": None, "verkoop": None}
        }
        last_updated = None
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            # Navigate to CME.sr
            await page.goto(CME_URL, wait_until="networkidle", timeout=30000)
            
            # Wait for JavaScript to load rates
            await asyncio.sleep(3)
            
            # Get page content after JavaScript rendering
            content = await page.content()
            
            # Parse the rendered HTML
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')
            text = soup.get_text()
            
            # Find all numbers that could be exchange rates
            all_numbers = re.findall(r'(\d+\.\d+)', text)
            
            # Filter for reasonable exchange rates (between 30 and 60 for SRD rates)
            valid_rates = [float(n) for n in all_numbers if 30 <= float(n) <= 60]
            
            # Look for patterns in the structured text
            # "We Buy:" section for inkoop, "We Sell:" section for verkoop
            
            # Try to find USD rates
            usd_pattern = re.findall(r'1\s*USD\s*=\s*(\d+\.?\d*)\s*SRD', text, re.IGNORECASE)
            if usd_pattern:
                valid_usd = [float(r) for r in usd_pattern if float(r) > 1]
                if len(valid_usd) >= 2:
                    rates["USD_SRD"]["inkoop"] = min(valid_usd[:2])  # Lower = inkoop
                    rates["USD_SRD"]["verkoop"] = max(valid_usd[:2])  # Higher = verkoop
                elif len(valid_usd) == 1:
                    rates["USD_SRD"]["inkoop"] = valid_usd[0]
                    rates["USD_SRD"]["verkoop"] = valid_usd[0]
            
            # Try to find EUR rates
            eur_pattern = re.findall(r'1\s*EURO?\s*=\s*(\d+\.?\d*)\s*SRD', text, re.IGNORECASE)
            if eur_pattern:
                valid_eur = [float(r) for r in eur_pattern if float(r) > 1]
                if len(valid_eur) >= 2:
                    rates["EUR_SRD"]["inkoop"] = min(valid_eur[:2])
                    rates["EUR_SRD"]["verkoop"] = max(valid_eur[:2])
                elif len(valid_eur) == 1:
                    rates["EUR_SRD"]["inkoop"] = valid_eur[0]
                    rates["EUR_SRD"]["verkoop"] = valid_eur[0]
            
            # Try to find EUR/USD treasury rates
            eur_usd_pattern = re.findall(r'EURO?\s*to\s*USD\s*=\s*(\d+\.?\d*)', text, re.IGNORECASE)
            if eur_usd_pattern:
                valid = [float(r) for r in eur_usd_pattern if float(r) > 0]
                if valid:
                    rates["EUR_USD"]["inkoop"] = valid[0]
            
            # Get last updated time
            last_updated_match = re.search(r'Last updated.*?on\s*(\d{1,2}-\w{3}-\d{4}\s+\d{1,2}:\d{2}\s*[AP]M)', text, re.IGNORECASE)
            last_updated = last_updated_match.group(1) if last_updated_match else None
            
            await browser.close()
        
        # Check if we got valid rates
        if rates["USD_SRD"]["inkoop"] is None and rates["EUR_SRD"]["inkoop"] is None:
            # Fallback: use hardcoded typical CME rates as last resort
            logger.warning("Could not parse CME rates, website might be blocking scraping")
            return {
                "success": False,
                "error": "Kon koersen niet parsen van CME.sr - website is mogelijk tijdelijk niet beschikbaar",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        return {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "CME.sr",
            "rates": rates,
            "last_updated": last_updated
        }
        
    except ImportError:
        logger.error("Playwright not installed")
        return {
            "success": False,
            "error": "Playwright is niet geïnstalleerd. Neem contact op met support.",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching CME rates: {e}")
        return {
            "success": False,
            "error": f"Fout bij ophalen koersen: {str(e)}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


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
