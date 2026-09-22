#!/usr/bin/env python3
"""
scripts/build_templates.py — regenerates the two free spreadsheets offered on the
Board Education Hub guides:

  public/downloads/cmgt-hoa-budget-template.xlsx         (/resources/hoa-budget-template)
  public/downloads/cmgt-hoa-reserve-study-template.xlsx  (/resources/hoa-reserve-study)

Run:  python3 scripts/build_templates.py   (needs: pip install openpyxl)

The numbers inside are the same illustrative figures the guides use on-page, so
the download and the article never disagree. Edit here, re-run, commit the xlsx.
"""
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

BLUE  = "1E1E77"   # --freedom-blue
GREEN = "4ACF6C"   # --landscaping-green
LIGHT = "F3F5FB"
INK   = "1A1414"
GUIDE_BUDGET  = "https://cmgt.org/resources/hoa-budget-template"
GUIDE_RESERVE = "https://cmgt.org/resources/hoa-reserve-study"
PROPOSAL      = "https://cmgt.org/request-a-proposal"

thin = Side(style="thin", color="D9DCE6")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
MONEY = '"$"#,##0;[Red]-"$"#,##0'
PCT   = "0.0%"

def title_block(ws, title, sub, width_cols):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=width_cols)
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=width_cols)
    ws["A1"] = title
    ws["A1"].font = Font(name="Arial", size=18, bold=True, color="FFFFFF")
    ws["A1"].fill = PatternFill("solid", fgColor=BLUE)
    ws["A1"].alignment = Alignment(vertical="center", indent=1)
    ws.row_dimensions[1].height = 34
    ws["A2"] = sub
    ws["A2"].font = Font(name="Arial", size=10, italic=True, color="FFFFFF")
    ws["A2"].fill = PatternFill("solid", fgColor=BLUE)
    ws["A2"].alignment = Alignment(vertical="center", indent=1)
    ws.row_dimensions[2].height = 20

def header_row(ws, row, labels):
    for i, lab in enumerate(labels, start=1):
        c = ws.cell(row=row, column=i, value=lab)
        c.font = Font(name="Arial", bold=True, color="FFFFFF", size=10)
        c.fill = PatternFill("solid", fgColor=GREEN)
        c.alignment = Alignment(vertical="center", wrap_text=True)
        c.border = BORDER
    ws.row_dimensions[row].height = 30

def section_row(ws, row, label, ncols):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=ncols)
    c = ws.cell(row=row, column=1, value=label)
    c.font = Font(name="Arial", bold=True, color=BLUE, size=11)
    c.fill = PatternFill("solid", fgColor=LIGHT)
    c.alignment = Alignment(indent=1)

def style_cells(ws, r1, r2, c1, c2, fmt=None, font=None, fill=None):
    for r in range(r1, r2 + 1):
        for c in range(c1, c2 + 1):
            cell = ws.cell(row=r, column=c)
            cell.border = BORDER
            cell.font = font or Font(name="Arial", size=10, color=INK)
            if fmt and c > 1:
                cell.number_format = fmt
            if fill:
                cell.fill = PatternFill("solid", fgColor=fill)

def footer(ws, row, ncols, guide):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=ncols)
    c = ws.cell(row=row, column=1, value="Illustrative figures, not a real community's financials. Not legal or financial advice. Free from CMGT — " + guide)
    c.font = Font(name="Arial", size=9, italic=True, color="6B6B6B")
    c.alignment = Alignment(wrap_text=True, indent=1)
    ws.row_dimensions[row].height = 28

def how_to_sheet(wb, lines, guide):
    ws = wb.create_sheet("How to use")
    ws.column_dimensions["A"].width = 110
    ws["A1"] = "How to use this template"
    ws["A1"].font = Font(name="Arial", size=16, bold=True, color=BLUE)
    for i, line in enumerate(lines, start=3):
        ws.cell(row=i, column=1, value=line).alignment = Alignment(wrap_text=True, vertical="top")
        ws.cell(row=i, column=1).font = Font(name="Arial", size=10, color=INK, bold=line.endswith(":"))
    r = 3 + len(lines) + 1
    ws.cell(row=r, column=1, value="Read the full guide: " + guide).hyperlink = guide
    ws.cell(row=r, column=1).font = Font(name="Arial", size=10, color="0563C1", underline="single")
    ws.cell(row=r + 1, column=1, value="Prefer not to build it yourself? CMGT prepares and manages association budgets and reserve plans for boards across the Gulf South: " + PROPOSAL).hyperlink = PROPOSAL
    ws.cell(row=r + 1, column=1).font = Font(name="Arial", size=10, color="0563C1", underline="single")
    ws.cell(row=r + 1, column=1).alignment = Alignment(wrap_text=True)
    ws.cell(row=r + 3, column=1, value="This template is general information for HOA boards, not legal, tax, or financial advice. Budget-adoption rules, reserve requirements, and lending guidelines vary by governing documents and state law — confirm your community's requirements with counsel.").alignment = Alignment(wrap_text=True)
    ws.cell(row=r + 3, column=1).font = Font(name="Arial", size=9, italic=True, color="6B6B6B")


# ─────────────────────────────────────────────────────────────────────────────
# 1. HOA BUDGET TEMPLATE
# ─────────────────────────────────────────────────────────────────────────────
def build_budget(path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Budget"
    NC = 5
    widths = [38, 16, 16, 16, 44]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    title_block(ws, "HOA Annual Budget Template", "Four sections — income, operating, reserves & contingency — plus the dues math. Yellow cells are yours to fill in.", NC)

    # Community basics
    ws["A4"] = "Fiscal year"; ws["B4"] = 2027
    ws["A5"] = "Number of homes / units"; ws["B5"] = 150
    ws["A6"] = "Payment periods per year (12 = monthly, 4 = quarterly, 1 = annual)"; ws["B6"] = 12
    ws["A7"] = "Delinquency allowance (share of dues you expect to arrive late)"; ws["B7"] = 0.05
    ws["B7"].number_format = PCT
    for r in range(4, 8):
        ws.cell(row=r, column=1).font = Font(name="Arial", size=10, bold=True, color=BLUE)
        ws.cell(row=r, column=2).fill = PatternFill("solid", fgColor="FFF6CC")
        ws.cell(row=r, column=2).border = BORDER
    ws.merge_cells("A6:A6")

    row = 9
    header_row(ws, row, ["Line item", "Last year — actual", "This year — budget", "Change", "Notes"])
    row += 1

    # Same $300,000 / 150-home example the guide prints line by line, so the
    # download and the article agree to the dollar. Income = expenses; surplus 0.
    sections = [
        ("INCOME", [
            ("Assessments / dues", 276000, 290500, "Primary income. Ties back to the dues math below."),
            ("Late fees & interest", 5000, 4000, ""),
            ("Clubhouse / amenity rentals", 3500, 4000, ""),
            ("Interest & other income", 1200, 1500, ""),
        ]),
        ("OPERATING EXPENSES", [
            ("Management fee", 44500, 46000, "Per your management agreement."),
            ("Insurance — master policy (property, GL, D&O, fidelity)", 39000, 44000, "Get the renewal quote before you finalize — premiums move."),
            ("Insurance — windstorm / flood (if separate)", 14500, 16000, "Gulf South: usually separate policies with their own deductibles."),
            ("Utilities — common areas (electric, water, gas)", 19000, 20000, ""),
            ("Landscaping & grounds", 33000, 34000, ""),
            ("Pool & amenity operations", 13500, 14000, "Service contract, chemicals, permits."),
            ("Repairs & maintenance — routine", 11200, 10000, "Day-to-day fixes. Big replacements belong in reserves."),
            ("Legal & accounting (audit, tax prep, counsel)", 7000, 7500, ""),
            ("Administrative (postage, meetings, software, website)", 3300, 3500, ""),
            ("Hurricane-season contingency", 0, 0, "Optional but smart on the coast. Give it its own line so it isn't spent on routine repairs."),
        ]),
        ("RESERVES & CONTINGENCY", [
            ("Reserve contribution (from the reserve study)", 84000, 90000, "Never a guess. Use the annual contribution your reserve study recommends."),
            ("General contingency (3–5% of operating)", 12000, 15000, "Absorbs surprises so you don't dip into reserves."),
        ]),
    ]

    totals = {}
    for name, items in sections:
        section_row(ws, row, name, NC); row += 1
        start = row
        for label, last, this, note in items:
            ws.cell(row=row, column=1, value=label)
            ws.cell(row=row, column=2, value=last)
            ws.cell(row=row, column=3, value=this)
            ws.cell(row=row, column=4, value=f"=C{row}-B{row}")
            ws.cell(row=row, column=5, value=note)
            row += 1
        end = row - 1
        style_cells(ws, start, end, 1, NC, fmt=MONEY)
        for r in range(start, end + 1):
            ws.cell(row=r, column=3).fill = PatternFill("solid", fgColor="FFF6CC")
            ws.cell(row=r, column=5).number_format = "General"
            ws.cell(row=r, column=5).alignment = Alignment(wrap_text=True)
        ws.cell(row=row, column=1, value=f"Total {name.lower()}")
        ws.cell(row=row, column=2, value=f"=SUM(B{start}:B{end})")
        ws.cell(row=row, column=3, value=f"=SUM(C{start}:C{end})")
        ws.cell(row=row, column=4, value=f"=C{row}-B{row}")
        style_cells(ws, row, row, 1, NC, fmt=MONEY, font=Font(name="Arial", size=10, bold=True, color=BLUE), fill=LIGHT)
        totals[name] = row
        row += 2

    # Summary + dues math
    section_row(ws, row, "SUMMARY & DUES MATH", NC); row += 1
    inc, opx, res = totals["INCOME"], totals["OPERATING EXPENSES"], totals["RESERVES & CONTINGENCY"]
    summary = [
        ("Total expenses (operating + reserves + contingency)", f"=C{opx}+C{res}", MONEY, "What the year actually costs to run."),
        ("Total income", f"=C{inc}", MONEY, ""),
        ("Surplus / (deficit)", f"=C{row+1}-C{row}", MONEY, "Aim for zero or a small surplus. A deficit means dues are too low or costs too high."),
        ("Annual assessment per home", f"=C{row}/$B$5", MONEY, "Total expenses ÷ homes."),
        ("Assessment per home, per payment period", f"=C{row+3}/$B$6", MONEY, "÷ payment periods (12 = monthly)."),
        ("…grossed up for the delinquency allowance", f"=C{row+4}/(1-$B$7)", MONEY, "What to actually bill so the plan still works when a few owners pay late."),
        ("Reserve contribution as % of total expenses", f"=C{res}/C{row}", PCT, "Lenders (e.g. Fannie Mae for condos) generally look for at least 10%."),
    ]
    for label, formula, fmt, note in summary:
        ws.cell(row=row, column=1, value=label)
        ws.cell(row=row, column=3, value=formula)
        ws.cell(row=row, column=5, value=note)
        style_cells(ws, row, row, 1, NC)
        ws.cell(row=row, column=3).number_format = fmt
        ws.cell(row=row, column=3).font = Font(name="Arial", size=10, bold=True, color=BLUE)
        ws.cell(row=row, column=5).alignment = Alignment(wrap_text=True)
        row += 1
    row += 1
    footer(ws, row, NC, GUIDE_BUDGET)
    ws.freeze_panes = "A10"

    # Sample budgets sheet — the same three examples the guide uses
    s2 = wb.create_sheet("Sample budgets")
    for col, w in zip("ABCDE", [34, 18, 18, 18, 18]):
        s2.column_dimensions[col].width = w
    title_block(s2, "Sample HOA budgets by community size", "Illustrative shapes to model against — plug your own numbers into the Budget tab.", 5)
    header_row(s2, 4, ["", "Small HOA (≈40 homes, no amenities)", "Mid-size (≈150 homes, pool & common areas)", "Large / master-planned (amenities & staff)", ""])
    rows = [
        ("Total annual budget", 40000, 300000, 1000000),
        ("Operating share", 0.75, 0.65, 0.60),
        ("Reserve share", 0.20, 0.30, 0.35),
        ("Contingency share", 0.05, 0.05, 0.05),
        ("Operating $", "=B5*B6", "=C5*C6", "=D5*D6"),
        ("Reserves $", "=B5*B7", "=C5*C7", "=D5*D7"),
        ("Contingency $", "=B5*B8", "=C5*C8", "=D5*D8"),
        ("Homes", 40, 150, 400),
        ("Dues per home, per month", "=B5/B12/12", "=C5/C12/12", "=D5/D12/12"),
    ]
    for i, (label, *vals) in enumerate(rows, start=5):
        s2.cell(row=i, column=1, value=label)
        for j, v in enumerate(vals, start=2):
            s2.cell(row=i, column=j, value=v)
        style_cells(s2, i, i, 1, 4)
        fmt = PCT if "share" in label else ("0" if label == "Homes" else MONEY)
        for j in range(2, 5):
            s2.cell(row=i, column=j).number_format = fmt
    s2.cell(row=15, column=1, value="Notice how the reserve share grows as a community adds amenities — more shared assets to replace.").font = Font(name="Arial", size=10, italic=True, color="6B6B6B")
    footer(s2, 17, 5, GUIDE_BUDGET)

    how_to_sheet(wb, [
        "1. Start with last year's actuals, not last year's budget. Fill the 'Last year — actual' column from your year-end financial statements.",
        "2. Fill the yellow cells: fiscal year, number of homes, payment periods, and the share of dues you expect to arrive late.",
        "3. Enter every recurring operating expense in 'This year — budget'. Get the insurance renewal quote before you finalize — in the Gulf South it's the line that moves most.",
        "4. Set the reserve contribution to the annual figure your reserve study recommends. If you don't have a current study, that's the first thing to fix (see cmgt.org/resources/hoa-reserve-study).",
        "5. Add a general contingency of 3–5% of operating costs, and a hurricane-season line if you're on the coast.",
        "6. Read the Summary: total expenses ÷ homes ÷ payment periods = dues. The grossed-up figure is what to actually bill so a few late payers don't sink the plan.",
        "7. Take the draft to the board, then follow your governing documents' notice and ratification process before the fiscal year begins.",
        "Tips:",
        "• Add or delete rows freely — the section totals use SUM ranges, so check they still cover your rows.",
        "• Use the Notes column to record where each number came from. Next year's treasurer will thank you.",
        "• Copy the whole workbook each year rather than overwriting it, so you keep a history.",
    ], GUIDE_BUDGET)

    wb.save(path)


# ─────────────────────────────────────────────────────────────────────────────
# 2. HOA RESERVE STUDY TEMPLATE (component inventory + funding snapshot)
# ─────────────────────────────────────────────────────────────────────────────
def build_reserve(path):
    wb = Workbook()
    ws = wb.active
    ws.title = "Component inventory"
    NC = 10
    widths = [30, 10, 10, 12, 12, 12, 12, 16, 16, 34]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    title_block(ws, "HOA Reserve Study Template — Component Inventory", "Walk your common areas with this list, then hand it to a credentialed reserve specialist (RS / PRA) to inspect and price. Yellow cells are yours.", NC)

    ws["A4"] = "Reserve study year"; ws["B4"] = 2026
    ws["A5"] = "Current reserve fund balance"; ws["B5"] = 240000
    ws["B5"].number_format = MONEY
    for r in (4, 5):
        ws.cell(row=r, column=1).font = Font(name="Arial", size=10, bold=True, color=BLUE)
        ws.cell(row=r, column=2).fill = PatternFill("solid", fgColor="FFF6CC")
        ws.cell(row=r, column=2).border = BORDER

    row = 7
    header_row(ws, row, [
        "Component", "Quantity", "Unit", "Year installed / last replaced",
        "Useful life (yrs)", "Remaining life (yrs)", "Condition (1–5)",
        "Replacement cost (today)", "Straight-line annual set-aside", "Notes / source of cost estimate",
    ])
    row += 1
    start = row
    # Same illustrative rows as the guide's on-page table, plus a few common extras.
    components = [
        ("Clubhouse roof", 1, "roof", 2005, 25, 3, 180000, "Quote from roofer, 2026"),
        ("Pool resurfacing", 1, "pool", 2021, 12, 3, 42000, ""),
        ("Private road overlay", 6200, "lin ft", 2016, 20, 3, 260000, "Paving contractor estimate"),
        ("Perimeter fencing", 3400, "lin ft", 2013, 15, 2, 28000, ""),
        ("Entrance gate & operators", 2, "gates", 2019, 12, 4, 24000, ""),
        ("Clubhouse HVAC", 2, "units", 2018, 15, 4, 18000, ""),
        ("Playground equipment", 1, "set", 2017, 15, 3, 35000, ""),
        ("Irrigation system (common areas)", 1, "system", 2010, 20, 3, 30000, ""),
        ("Monument signage & lighting", 2, "signs", 2015, 15, 3, 12000, ""),
        ("Pool deck & furniture", 1, "deck", 2021, 10, 4, 15000, ""),
    ]
    for comp, qty, unit, year, life, cond, cost, note in components:
        ws.cell(row=row, column=1, value=comp)
        ws.cell(row=row, column=2, value=qty)
        ws.cell(row=row, column=3, value=unit)
        ws.cell(row=row, column=4, value=year)
        ws.cell(row=row, column=5, value=life)
        ws.cell(row=row, column=6, value=f"=MAX(0,E{row}-($B$4-D{row}))")
        ws.cell(row=row, column=7, value=cond)
        ws.cell(row=row, column=8, value=cost)
        ws.cell(row=row, column=9, value=f"=IF(F{row}>0,H{row}/F{row},H{row})")
        ws.cell(row=row, column=10, value=note)
        row += 1
    # Blank rows to fill in
    for _ in range(8):
        ws.cell(row=row, column=6, value=f"=IF(E{row}=\"\",\"\",MAX(0,E{row}-($B$4-D{row})))")
        ws.cell(row=row, column=9, value=f"=IF(H{row}=\"\",\"\",IF(F{row}>0,H{row}/F{row},H{row}))")
        row += 1
    end = row - 1
    style_cells(ws, start, end, 1, NC)
    for r in range(start, end + 1):
        for c in (1, 2, 3, 4, 5, 7, 8, 10):
            ws.cell(row=r, column=c).fill = PatternFill("solid", fgColor="FFF6CC")
        ws.cell(row=r, column=8).number_format = MONEY
        ws.cell(row=r, column=9).number_format = MONEY
        ws.cell(row=r, column=10).alignment = Alignment(wrap_text=True)
    dv = DataValidation(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True)
    dv.error = "Condition is a 1–5 score: 5 = like new, 1 = failing."
    ws.add_data_validation(dv); dv.add(f"G{start}:G{end}")

    ws.cell(row=row, column=1, value="Totals")
    ws.cell(row=row, column=8, value=f"=SUM(H{start}:H{end})")
    ws.cell(row=row, column=9, value=f"=SUM(I{start}:I{end})")
    style_cells(ws, row, row, 1, NC, font=Font(name="Arial", size=10, bold=True, color=BLUE), fill=LIGHT)
    ws.cell(row=row, column=8).number_format = MONEY
    ws.cell(row=row, column=9).number_format = MONEY
    totals_row = row
    row += 2
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=NC)
    ws.cell(row=row, column=1, value="Remaining life = useful life − age. Annual set-aside = replacement cost ÷ remaining life (the straight-line component method). Real studies pool components so one big-ticket year doesn't swamp the plan — this sheet is for preparing, not replacing, the professional study.").alignment = Alignment(wrap_text=True, indent=1)
    ws.cell(row=row, column=1).font = Font(name="Arial", size=9, italic=True, color="6B6B6B")
    ws.row_dimensions[row].height = 40
    footer(ws, row + 1, NC, GUIDE_RESERVE)
    ws.freeze_panes = "B8"

    # Funding snapshot
    s2 = wb.create_sheet("Funding snapshot")
    s2.column_dimensions["A"].width = 52; s2.column_dimensions["B"].width = 20; s2.column_dimensions["C"].width = 60
    title_block(s2, "Funding snapshot — where does the community stand?", "Percent funded is the single number to watch. Above 70% is generally considered strong; under 30% is a special assessment waiting to happen.", 3)
    header_row(s2, 4, ["Measure", "Value", "What it means"])
    inv = "'Component inventory'"
    lines = [
        ("Current reserve balance", f"={inv}!B5", MONEY, "From your most recent balance sheet."),
        ("Fully funded balance (what you 'should' have today)", f"=SUMPRODUCT({inv}!H{start}:H{end},({inv}!$B$4-{inv}!D{start}:D{end})/{inv}!E{start}:E{end})", MONEY, "Each component's replacement cost × the share of its life already used up, summed."),
        ("Percent funded", f"=IF(B6>0,B5/B6,0)", PCT, "Under 30%: weak. 30–70%: fair. Over 70%: strong. Your study sets the target."),
        ("Straight-line annual contribution (sum of set-asides)", f"={inv}!I{totals_row}", MONEY, "A starting point for the reserve line in your budget. The professional study will refine it."),
        ("Total replacement cost of all components", f"={inv}!H{totals_row}", MONEY, "The scale of what the community is responsible for."),
    ]
    for i, (label, f, fmt, note) in enumerate(lines, start=5):
        s2.cell(row=i, column=1, value=label)
        s2.cell(row=i, column=2, value=f)
        s2.cell(row=i, column=3, value=note)
        style_cells(s2, i, i, 1, 3)
        s2.cell(row=i, column=2).number_format = fmt
        s2.cell(row=i, column=2).font = Font(name="Arial", size=10, bold=True, color=BLUE)
        s2.cell(row=i, column=3).alignment = Alignment(wrap_text=True)
        s2.row_dimensions[i].height = 30
    footer(s2, 12, 3, GUIDE_RESERVE)

    how_to_sheet(wb, [
        "1. Enter the current reserve fund balance and the study year in the yellow cells at the top of 'Component inventory'.",
        "2. Walk the common areas with a board member or your manager. List every shared asset the association is responsible for replacing: roofs, roads, pool, fencing, gates, HVAC, playground, signage, irrigation.",
        "3. For each component, record quantity, the year it was installed or last replaced, its typical useful life, and a 1–5 condition score. Remaining life calculates itself.",
        "4. Enter today's replacement cost. Use real quotes where you have them and note the source; otherwise a contractor's ballpark is fine for a first pass.",
        "5. Read the 'Funding snapshot' tab: percent funded tells you whether the community is on track, and the straight-line contribution is a starting point for the reserve line in your budget (see cmgt.org/resources/hoa-budget-template).",
        "6. Hand the draft list to an independent, credentialed reserve specialist (RS or PRA designation). They will inspect, correct, and price it against National Reserve Study Standards — this template prepares you for that study, it does not replace it.",
        "Tips:",
        "• Lenders, insurers, and buyers give weight to the professional report, not to a spreadsheet. Commission a full study every 3–5 years and update it annually.",
        "• Louisiana, Mississippi, Alabama, and Texas generally don't mandate reserve studies for HOAs; Florida requires structural integrity reserve studies for many condo buildings. Not required does not mean not needed.",
        "• Pair this with your master insurance policy review: a percentage named-storm deductible is a reserve question too.",
    ], GUIDE_RESERVE)

    wb.save(path)


if __name__ == "__main__":
    build_budget("public/downloads/cmgt-hoa-budget-template.xlsx")
    build_reserve("public/downloads/cmgt-hoa-reserve-study-template.xlsx")
    print("built public/downloads/*.xlsx")
