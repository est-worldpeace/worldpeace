# Bakery forecasting model

This directory contains a Python inference port of the final combined model from
[`SengangLemon/naeil-bbang`](https://github.com/SengangLemon/naeil-bbang) at commit
`0e233c3d312674b1624ab377334af3e05683d42b`.

Imported artifacts:

- `artifacts/model-pack.json`: fitted Extra Trees, CatBoost and spline Ridge parameters
- `artifacts/model-provenance.json`: training range, source and SHA-256
- `backend/tests/fixtures/port-fixtures.json`: reference engine outputs

`bakery_model.py` preserves the reference feature generation, base predictions,
weekly expert weighting, daily residual calibration and production rounding.
New store products intentionally use all-zero research product indicators instead
of pretending to be one of the six German training SKUs. Store transfer has not
been independently validated.

Run the parity tests from the repository root:

```powershell
$env:PYTHONPATH = (Resolve-Path backend).Path
python -m unittest discover -s backend/tests -v
```
