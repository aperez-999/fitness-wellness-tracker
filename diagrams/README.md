# Diagrams

Sprint 1–2 planning deliverables. All diagrams use [Mermaid](https://mermaid.js.org/) so they render on GitHub and in Markdown previews.

## Contents

| File | Sprint story | Description |
|------|--------------|-------------|
| [system-architecture.md](./system-architecture.md) | US #8 | Three-tier architecture, components, API surface, sequence diagram |
| [user-workflows.md](./user-workflows.md) | US #9, #16 | Auth, navigation, logging, progress flows |
| [database-erd.md](./database-erd.md) | US #11, #18 | ERD + derived progress model |

## Related Documentation

- Text wireframes: [../docs/wireframes.md](../docs/wireframes.md)
- Database field reference: [../docs/database-schema.md](../docs/database-schema.md)
- User journeys: [../docs/user-journeys.md](../docs/user-journeys.md)
- Module map: [../docs/component-planning.md](../docs/component-planning.md)

## Viewing Diagrams

- **GitHub:** Open any `.md` file in this folder; Mermaid blocks render automatically.
- **VS Code / Cursor:** Install a Mermaid preview extension or use Markdown preview.
- **Export:** Use [Mermaid Live Editor](https://mermaid.live) to export PNG/SVG for presentations.

## Maintenance

Update diagrams when:

- New major features are added to the MVP.
- API routes or database collections change.
- Authentication or navigation flow changes.
