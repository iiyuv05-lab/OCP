# Collaboration packet example

This directory contains the non-sensitive, synthetic public fixture for `OCP Collaboration Domain Profile v0.1`.

- `collaboration-packet.schema.json` defines the transfer envelope.
- `collaboration-pilot-01.json` demonstrates a draft packet with review and application kept separate.

The fixture intentionally excludes personal names, account identifiers, credentials, personal pain details, and private source contents. `private-vault://` references demonstrate external provenance; they do not claim that the referenced private content exists in this repository or is accessible at runtime.

Zero-dependency validation:

```bash
node examples/collaboration/validate.mjs
```

This is a schema and fixture only. It does not implement automatic import, login, review UI, Canonical Graph application, workflow execution, or web publication.
