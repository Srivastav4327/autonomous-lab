# HELIX — Closed-loop discovery OS

A working demo of **continuous scientific and industrial discovery**: multi-agent hypothesis generation, experiment design, hardware queueing (robotic lab / testbed / sensors), scientist approval gates, knowledge-graph updates, and an append-only provenance ledger.

This is a simulated control room, not a production LIMS. Campaigns in energy storage, drug discovery, additive manufacturing, and agriculture run a closed loop so you can watch knowledge compound.

## Run

```bash
npm install
npm run dev
```

Then open the printed local URL. Use **Run loop** / **Pause loop**, switch campaigns, and **Approve & queue** when Pythia holds a high-stakes protocol.

## Loop

Ingest → Hypothesize (Athena) → Design (Daedalus) → Approve (human or policy) → Queue (Hermes) → Run → Measure (Pythia) → Update ontology (Mnemosyne) → next cycle.
