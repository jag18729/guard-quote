# User Acceptance Testing (UAT) Guide

**Owner:** Xavier Nguyen  
**Role:** User Testing & Customer Liaison  
**Last Updated:** 2026-04-07

---

## Your Mission

You're the **voice of the customer**. Your job is to use GuardQuote like a real user would — find what's confusing, what breaks, and what could be better. You're not looking for code bugs (that's dev work) — you're testing the *experience*.

---

## Quick Start

### Sites to Test

| Site | URL | What to Test |
|------|-----|--------------|
| Landing Page | https://guardquote.vandine.us/ | First impressions, CTA clarity |
| Get Quote | https://guardquote.vandine.us/quote | Form usability, validation |
| Admin Login | https://guardquote.vandine.us/login | Login flow |
| Admin Dashboard | https://guardquote.vandine.us/admin | Navigation, data display |

**Test Credentials:** admin@guardquote.com / [see .env]

---

## Testing Methodology

### 1. Multi-Browser Testing

Test on **at least 3 browsers** to catch rendering/JS differences:

| Browser | Priority | Download |
|---------|----------|----------|
| Chrome | 🔴 High | Most users have this |
| Firefox | 🔴 High | Different rendering engine |
| Safari | 🟡 Medium | Mac/iOS users |
| Edge | 🟡 Medium | Windows default |
| Mobile Chrome | 🔴 High | Use phone or DevTools |
| Mobile Safari | 🟡 Medium | iPhone users |

#### How to Test Mobile on Desktop
1. Open Chrome DevTools (F12 or Cmd+Opt+I)
2. Click the device toggle icon (top-left of DevTools)
3. Select "iPhone 14 Pro" or "Pixel 7"
4. Refresh the page
5. Test the full flow

#### Browser Testing Checklist
For each browser, check:
- [ ] Page loads without errors
- [ ] Images display correctly
- [ ] Buttons are clickable
- [ ] Forms submit properly
- [ ] Animations are smooth
- [ ] Text is readable (no overlap)

### 2. Test Scenarios

#### Scenario A: New Customer Quote Request
```
1. Open landing page (incognito/private mode)
2. Read the page — is the value proposition clear?
3. Click "Get Quote"
4. Fill out the form with realistic data:
   - Name: John Smith
   - Email: john.smith@example.com
   - Phone: (555) 123-4567
   - Coverage type: Auto
   - Details: 2020 Honda Civic, clean driving record
5. Submit the form
6. Note: Was there a success message? Was it clear?
```

#### Scenario B: Form Validation Testing
```
1. Go to quote form
2. Try submitting with empty fields
3. Try invalid email (e.g., "notanemail")
4. Try invalid phone (e.g., "abc")
5. Try extremely long text in description
6. Try special characters: <script>alert('xss')</script>
7. Document what happens for each
```

#### Scenario C: Admin Dashboard Navigation
```
1. Log in as admin
2. Navigate to each menu item
3. Check if data loads
4. Try using the search (if available)
5. Check if charts/graphs render
6. Log out — does it redirect properly?
```

#### Scenario D: Mobile Usability
```
1. Open site on phone (or DevTools mobile view)
2. Can you tap all buttons easily?
3. Does the menu work?
4. Can you fill out the form on mobile?
5. Is text readable without zooming?
```

### 3. Accessibility Quick Checks

Even basic accessibility matters:
- [ ] Can you tab through the form with keyboard only?
- [ ] Do buttons have visible focus states?
- [ ] Is text contrast readable?
- [ ] Do images have alt text? (right-click → Inspect)

---

## Documentation Standards

### Screenshot Best Practices

#### What to Capture
- **Bugs:** The exact error/broken state
- **Confusing UI:** Annotate what's unclear
- **Before/After:** If suggesting improvements
- **Success states:** Proof that features work

#### How to Capture

**Windows:**
- `Win + Shift + S` → Select area → Paste into doc
- Or use Snipping Tool

**Mac:**
- `Cmd + Shift + 4` → Select area
- Screenshots save to Desktop

**Browser:**
- Chrome DevTools → Cmd+Shift+P → "Capture full size screenshot"
- Firefox → Right-click → "Take Screenshot"

#### Naming Convention
```
YYYY-MM-DD_browser_page_description.png

Examples:
2026-02-14_chrome_quote-form_validation-error.png
2026-02-14_firefox_dashboard_charts-not-loading.png
2026-02-14_mobile_landing_menu-overlap.png
```

#### Annotation Tools
- **Snagit** (paid, best)
- **Greenshot** (free, Windows)
- **Skitch** (free, Mac)
- **Browser extension:** Awesome Screenshot

Add arrows, circles, and text to highlight issues.

---

## Report Template

Create one report per testing session. Use this structure:

```markdown
# UAT Report - [Date]

**Tester:** Xavier Nguyen
**Browser(s):** Chrome 122, Firefox 123, Mobile Safari
**Duration:** 2 hours
**Build/Version:** (commit hash if known)

---

## Executive Summary

[2-3 sentences: Overall impression, major findings, recommendation]

Example:
> The quote submission flow works well on desktop but has usability 
> issues on mobile. Found 3 bugs and 5 UX improvements. Recommend 
> fixing mobile menu before UAT Round 2.

---

## Test Results

### ✅ Passed
| Test Case | Browser | Notes |
|-----------|---------|-------|
| Landing page loads | All | < 2s load time |
| Quote form submits | Chrome, Firefox | Success message shown |
| Admin login works | All | Redirects to dashboard |

### ❌ Failed
| Test Case | Browser | Issue | Severity | Screenshot |
|-----------|---------|-------|----------|------------|
| Mobile menu | Safari | Overlaps content | High | mobile_menu_bug.png |
| Quote validation | Firefox | No error for invalid email | Medium | email_validation.png |

### ⚠️ Issues Found

#### Issue 1: [Title]
- **Severity:** High / Medium / Low
- **Browser:** Chrome 122
- **Steps to Reproduce:**
  1. Go to /quote
  2. Enter invalid email
  3. Click submit
- **Expected:** Error message appears
- **Actual:** Form submits anyway
- **Screenshot:** [link or filename]

#### Issue 2: [Title]
...

---

## UX Recommendations

| Area | Current | Suggestion | Priority |
|------|---------|------------|----------|
| Quote form | Submit button says "Submit" | Change to "Get My Quote" | Low |
| Dashboard | No loading indicator | Add spinner while data loads | Medium |

---

## Datasets Acquired

| Dataset | Source | Records | Use Case |
|---------|--------|---------|----------|
| Sample quotes | Created manually | 10 | Demo data |
| Auto insurance rates | [source] | 500 | ML training |

---

## Conclusions

[Summary paragraph: What's working, what needs attention, overall readiness]

Example:
> The core functionality is solid. Desktop experience is good. 
> Mobile needs work before customer demos. Recommend addressing 
> the 3 high-severity issues before UAT Round 2. The quote flow 
> is intuitive and should demo well.

---

## Next Steps

- [ ] File GitHub issues for bugs found
- [ ] Retest after fixes
- [ ] Prepare demo script for presentation
```

---

## Severity Levels

| Level | Definition | Example |
|-------|------------|---------|
| 🔴 **Critical** | Blocks core functionality | Can't submit quotes at all |
| 🟠 **High** | Major feature broken | Mobile layout unusable |
| 🟡 **Medium** | Feature works but has issues | Validation missing |
| 🟢 **Low** | Minor/cosmetic | Typo, alignment off |

---

## Filing GitHub Issues

When you find a bug, file it on GitHub:

1. Go to https://github.com/jag18729/guard-quote/issues
2. Click "New Issue"
3. Use this format:

```markdown
**Title:** [Browser] Brief description of issue

**Environment:**
- Browser: Chrome 122 on Windows 11
- Device: Desktop / Mobile
- Date: 2026-02-14

**Steps to Reproduce:**
1. Go to [URL]
2. Do [action]
3. See [result]

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Screenshot:**
[Drag and drop image here]

**Severity:** High / Medium / Low
```

---

## Dataset Acquisition

Part of your role is finding realistic test data:

### What We Need
- Sample customer profiles (fake data)
- Realistic insurance scenarios
- Edge cases (high-risk drivers, multiple vehicles, etc.)
- Competitive pricing examples

### Where to Look
- Kaggle datasets (insurance-related)
- Public insurance rate examples
- Create synthetic data based on real patterns
- Interview friends/family about their insurance experience

### Data Privacy
- **Never use real customer data**
- Use fake names, emails, phone numbers
- Synthetic data generators: Mockaroo, Faker.js

---

## Schedule

| Date | Milestone | Your Deliverable |
|------|-----------|------------------|
| Feb 14 | UAT Round 1 | Initial test report |
| Feb 19 | UAT Round 2 | Follow-up report (verify fixes) |
| Feb 28 | Presentation Ready | Demo script, sample datasets |

---

## Tools Checklist

Before starting UAT, make sure you have:

- [ ] Access to all test URLs
- [ ] Login credentials saved
- [ ] Multiple browsers installed
- [ ] Screenshot tool ready
- [ ] Report template copied
- [ ] GitHub account access
- [ ] Phone for mobile testing

---

## Questions?

- **Rafa:** Technical questions, access issues
- **Milkias:** Process, documentation format
- **GitHub Issues:** Bug reports and feature requests

---

*Remember: You're the customer's advocate. If something confuses you, it'll confuse them too. Speak up!*
