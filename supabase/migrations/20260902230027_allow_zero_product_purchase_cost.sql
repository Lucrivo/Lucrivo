alter table public.product_diagnoses
drop constraint product_diagnoses_prices_check,
add constraint product_diagnoses_prices_check check (
  purchase_unit_cost_cents >= 0 and unit_sale_price_cents > 0
);
