from .base import *

# ============== LENINGEN (LOANS) ENDPOINTS ==============

@router.get("/admin/loans")
async def list_loans(company: dict = Depends(get_current_company)):
    """List all loans with tenant info and payment stats"""
    company_id = company["company_id"]
    loans = await db.kiosk_loans.find({"company_id": company_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    result = []
    for loan in loans:
        # Get total paid
        payments = await db.kiosk_loan_payments.find(
            {"loan_id": loan["loan_id"]}, {"_id": 0, "amount": 1}
        ).to_list(1000)
        total_paid = sum(p.get("amount", 0) for p in payments)
        remaining = max(0, loan["amount"] - total_paid)
        
        result.append({
            **loan,
            "total_paid": total_paid,
            "remaining": remaining,
            "payment_count": len(payments),
        })
    
    return result

@router.get("/admin/loans/{loan_id}")
async def get_loan(loan_id: str, company: dict = Depends(get_current_company)):
    """Get loan detail with payment history"""
    loan = await db.kiosk_loans.find_one(
        {"loan_id": loan_id, "company_id": company["company_id"]}, {"_id": 0}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Lening niet gevonden")
    
    payments = await db.kiosk_loan_payments.find(
        {"loan_id": loan_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    total_paid = sum(p.get("amount", 0) for p in payments)
    remaining = max(0, loan["amount"] - total_paid)
    
    return {
        **loan,
        "total_paid": total_paid,
        "remaining": remaining,
        "payments": payments,
    }

@router.post("/admin/loans")
async def create_loan(data: LoanCreate, company: dict = Depends(get_current_company)):
    """Create a new loan for a tenant"""
    company_id = company["company_id"]
    tenant = await db.kiosk_tenants.find_one({"tenant_id": data.tenant_id, "company_id": company_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Huurder niet gevonden")
    
    now = datetime.now(timezone.utc)
    loan_id = generate_uuid()
    
    loan = {
        "loan_id": loan_id,
        "company_id": company_id,
        "tenant_id": data.tenant_id,
        "tenant_name": tenant["name"],
        "apartment_number": tenant.get("apartment_number", ""),
        "amount": data.amount,
        "monthly_payment": data.monthly_payment,
        "start_date": data.start_date or now.strftime("%Y-%m-%d"),
        "description": data.description or "",
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    await db.kiosk_loans.insert_one(loan)
    loan.pop("_id", None)
    
    # === AUTO WHATSAPP: Nieuwe lening notificatie ===
    try:
        t_phone = tenant.get("phone") or tenant.get("telefoon", "")
        if t_phone:
            comp_name = company.get("stamp_company_name") or company.get("name", "")
            wa_loan_msg = (f"Beste {tenant['name']},\n\n"
                           f"Er is een lening van SRD {data.amount:,.2f} geregistreerd op uw naam.\n"
                           f"Maandelijkse aflossing: SRD {data.monthly_payment:,.2f}\n"
                           f"{('Omschrijving: ' + data.description + chr(10)) if data.description else ''}\n"
                           f"Met vriendelijke groet,\n{comp_name}")
            await _send_message_auto(company_id, t_phone, wa_loan_msg, data.tenant_id, tenant["name"], "loan_created")
    except Exception:
        pass
    
    return {**loan, "total_paid": 0, "remaining": data.amount}

@router.put("/admin/loans/{loan_id}")
async def update_loan(loan_id: str, data: LoanUpdate, company: dict = Depends(get_current_company)):
    """Update a loan"""
    existing = await db.kiosk_loans.find_one(
        {"loan_id": loan_id, "company_id": company["company_id"]}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Lening niet gevonden")
    
    updates = {k: v for k, v in data.dict().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc)
    await db.kiosk_loans.update_one({"loan_id": loan_id}, {"$set": updates})
    
    return {"message": "Lening bijgewerkt"}

@router.delete("/admin/loans/{loan_id}")
async def delete_loan(loan_id: str, company: dict = Depends(get_current_company)):
    """Delete a loan and its payments"""
    result = await db.kiosk_loans.delete_one(
        {"loan_id": loan_id, "company_id": company["company_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lening niet gevonden")
    await db.kiosk_loan_payments.delete_many({"loan_id": loan_id})
    return {"message": "Lening verwijderd"}

@router.post("/admin/loans/{loan_id}/pay")
async def create_loan_payment(loan_id: str, data: LoanPaymentCreate, company: dict = Depends(get_current_company)):
    """Register a payment on a loan"""
    company_id = company["company_id"]
    loan = await db.kiosk_loans.find_one(
        {"loan_id": loan_id, "company_id": company_id}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Lening niet gevonden")
    if loan.get("status") != "active":
        raise HTTPException(status_code=400, detail="Lening is niet actief")
    
    tenant = await db.kiosk_tenants.find_one({"tenant_id": loan["tenant_id"]})
    now = datetime.now(timezone.utc)
    payment_id = generate_uuid()
    
    # Calculate totals
    existing_payments = await db.kiosk_loan_payments.find(
        {"loan_id": loan_id}, {"_id": 0, "amount": 1}
    ).to_list(1000)
    total_paid_before = sum(p.get("amount", 0) for p in existing_payments)
    remaining_before = loan["amount"] - total_paid_before
    
    if data.amount > remaining_before:
        raise HTTPException(status_code=400, detail=f"Bedrag kan niet hoger zijn dan het openstaande saldo (SRD {remaining_before:,.2f})")
    
    total_paid_after = total_paid_before + data.amount
    remaining = max(0, loan["amount"] - total_paid_after)
    
    payment = {
        "payment_id": payment_id,
        "loan_id": loan_id,
        "company_id": company_id,
        "tenant_id": loan["tenant_id"],
        "tenant_name": loan.get("tenant_name", ""),
        "amount": data.amount,
        "description": data.description or "Aflossing",
        "payment_method": data.payment_method,
        "remaining_after": remaining,
        "created_at": now,
    }
    await db.kiosk_loan_payments.insert_one(payment)
    
    # Auto mark as paid_off
    if remaining <= 0:
        await db.kiosk_loans.update_one(
            {"loan_id": loan_id},
            {"$set": {"status": "paid_off", "updated_at": now}}
        )
    
    # === AUTO WHATSAPP: Leningaflossing notificatie ===
    try:
        if tenant:
            t_phone = tenant.get("phone") or tenant.get("telefoon", "")
            if t_phone:
                comp_name = company.get("stamp_company_name") or company.get("name", "")
                if remaining <= 0:
                    wa_pay_msg = (f"Beste {loan['tenant_name']},\n\n"
                                  f"Uw aflossing van SRD {data.amount:,.2f} is ontvangen.\n"
                                  f"Uw lening van SRD {loan['amount']:,.2f} is nu VOLLEDIG AFGELOST!\n\n"
                                  f"Bedankt!\n{comp_name}")
                else:
                    wa_pay_msg = (f"Beste {loan['tenant_name']},\n\n"
                                  f"Uw aflossing van SRD {data.amount:,.2f} is ontvangen.\n"
                                  f"Totaal afgelost: SRD {total_paid_after:,.2f}\n"
                                  f"Resterend: SRD {remaining:,.2f}\n\n"
                                  f"Met vriendelijke groet,\n{comp_name}")
                await _send_message_auto(company_id, t_phone, wa_pay_msg, loan["tenant_id"], loan["tenant_name"], "loan_payment")
    except Exception:
        pass
    
    return {
        "payment_id": payment_id,
        "amount": data.amount,
        "total_paid": total_paid_after,
        "remaining": remaining,
        "loan_status": "paid_off" if remaining <= 0 else "active",
    }


