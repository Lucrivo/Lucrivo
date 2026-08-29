alter table public.service_diagnoses
drop constraint service_diagnoses_pricing_shape_check;

alter table public.service_diagnoses
add constraint service_diagnoses_pricing_shape_check check (
  (
    pricing_method = 'hour'
    and hourly_rate_cents > 0
    and minute_rate_cents = 0
    and appointment_rate_cents = 0
    and appointment_duration_minutes = 0
  )
  or (
    pricing_method = 'minute'
    and minute_rate_cents > 0
    and appointment_duration_minutes > 0
    and hourly_rate_cents = 0
    and appointment_rate_cents = 0
  )
  or (
    pricing_method = 'appointment'
    and appointment_rate_cents > 0
    and appointment_duration_minutes > 0
    and hourly_rate_cents = 0
    and minute_rate_cents = 0
  )
);
