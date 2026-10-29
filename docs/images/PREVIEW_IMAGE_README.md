# Preview Image Creation Guide

## Purpose
Create a professional preview image for social sharing (Open Graph / Twitter Cards).

## Specifications

- **Dimensions**: 1200x630 pixels (optimal for social sharing)
- **Format**: PNG
- **Filename**: `preview.png`
- **Location**: `docs/images/preview.png`

## Recommended Content

### Visual Elements
1. **Title**: "IAM Lifecycle Automation Platform"
2. **Subtitle**: "Enterprise Identity Management with Microsoft Entra ID & Active Directory"
3. **Author**: Mohammad Khan - IAM & Microsoft Security

### Key Metrics to Display
- 8,000+ Users Supported
- 40% Time Savings
- 100% Policy Coverage
- 98.5% Compliance Score

### Branding
- Use the project's color scheme:
  - Primary: #0066CC (blue)
  - Secondary: #14B8A6 (teal)
  - Background: #0F172A (dark) or #F9FAFB (light)
- Include Microsoft Entra ID and Python/PowerShell icons

### Architecture Preview
- Consider including a simplified version of the architecture diagram
- Show the flow: HR → AD → Entra ID → Audit

## Tools for Creation

1. **Figma** (free): https://figma.com
2. **Canva** (free): https://canva.com
3. **Adobe Express** (free): https://express.adobe.com
4. **GIMP** (free, open source): https://gimp.org

## Example Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│    🔐 IAM LIFECYCLE AUTOMATION PLATFORM                     │
│                                                              │
│    Enterprise Identity Management                            │
│    Entra ID • Active Directory • Python • PowerShell        │
│                                                              │
│    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│    │  8,000+ │  │   40%   │  │  100%   │  │  98.5%  │      │
│    │  Users  │  │ Savings │  │ Policy  │  │Compliant│      │
│    └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│                                                              │
│    Mohammad Khan | IAM & Microsoft Security                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## After Creating

1. Save the image as `preview.png` in `docs/images/`
2. The meta tags in `docs/index.html` are already configured to use this image
3. Test with: https://developers.facebook.com/tools/debug/
4. Test with: https://cards-dev.twitter.com/validator

