-- Dados exclusivamente locais para desenvolvimento e testes manuais.
-- Login: teste@email.com / 12345678AA

begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '10000000-0000-4000-8000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'teste@email.com',
  extensions.crypt('12345678AA', extensions.gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"email_verified":true}'::jsonb,
  now(),
  now(),
  false,
  false
)
on conflict (id) do update set
  instance_id = excluded.instance_id,
  aud = excluded.aud,
  role = excluded.role,
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now(),
  deleted_at = null,
  is_sso_user = false,
  is_anonymous = false;

insert into auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '10000000-0000-4000-8000-000000000002'::uuid,
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001'::uuid,
  '{"sub":"10000000-0000-4000-8000-000000000001","email":"teste@email.com","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do update set
  user_id = excluded.user_id,
  identity_data = excluded.identity_data,
  updated_at = now();

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

-- Serviços: preço saudável, margem apertada e prejuízo direto.
select public.create_service_diagnosis_report(
  p_submission_id => '11000000-0000-4000-8000-000000000001'::uuid,
  p_pricing_method => 'hour'::public.service_pricing_method,
  p_desired_monthly_income_cents => 400000::bigint,
  p_fixed_monthly_expenses_cents => 200000::bigint,
  p_work_hours_period => 'week'::public.service_work_hours_period,
  p_work_period_minutes => 1800::integer,
  p_monthly_work_minutes => 7794::integer,
  p_weekly_work_days => 5::smallint,
  p_hourly_rate_cents => 15000::bigint,
  p_minute_rate_cents => 0::bigint,
  p_appointment_rate_cents => 0::bigint,
  p_appointment_duration_minutes => 0::integer,
  p_material_unit_cost_cents => 1000::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 3::smallint,
  p_calculation_version => 2::smallint,
  p_content_version => 4::smallint,
  p_scenario => 'hour'::text,
  p_current_price_cents => 15000::bigint,
  p_real_margin_basis_points => 5454::integer,
  p_unit_profit_cents => 8181::bigint,
  p_verdict => 'above_target'::text,
  p_priority => 'volume'::text,
  p_unit => 'hour'::text,
  p_report_snapshot => $report$
{
  "category": "service",
  "scenario": "hour",
  "currency": "BRL",
  "unit": "hour",
  "policy": {
    "targetMarginBasisPoints": 1500,
    "weeklyDivisorHundredths": 433,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": true
  },
  "inputs": {
    "desiredMonthlyIncomeCents": 400000,
    "fixedMonthlyExpensesCents": 200000,
    "monthlyWorkMinutes": 7794,
    "weeklyWorkDays": 5,
    "hourlyRateCents": 15000,
    "minuteRateCents": 0,
    "appointmentRateCents": 0,
    "appointmentDurationMinutes": 0,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200,
    "workHoursPeriod": "week",
    "workPeriodMinutes": 1800,
    "materialUnitCostCents": 1000
  },
  "results": {
    "monthlyCostCents": 600000,
    "hourCostCents": 4619,
    "unitCostCents": 5619,
    "currentPriceCents": 15000,
    "netRevenueCents": 13800,
    "unitProfitCents": 8181,
    "realMarginBasisPoints": 5454,
    "minimumPriceCents": 6108,
    "targetPriceCents": 7298,
    "monthlySalesGoal": 47,
    "weeklySalesGoal": 11,
    "dailySalesGoal": 3,
    "breakEvenDiscountPercent": 59,
    "priority": "volume",
    "structureUnitCostCents": 4619,
    "materialUnitCostCents": 1000,
    "unitContributionCents": 12800,
    "verdict": "above_target"
  },
  "executiveSummary": {
    "headline": "Seu serviço dá lucro?",
    "introduction": "Veja quanto sobra do valor cobrado e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Acima da meta",
      "body": "O preço paga os gastos e passa da meta de 15%. Acompanhe se seus clientes aceitam o preço e mantenha a quantidade de trabalho.",
      "tone": "positive"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "54,54%",
        "referenceLabel": "Meta",
        "referenceValue": "15%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 150,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 72,98"
      }
    ],
    "priority": {
      "label": "Quantidade de serviços",
      "body": "Seu preço alcança a meta. Agora mantenha a quantidade de trabalho usada no cálculo."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Sim — sobram R$ 81,81 por hora depois de pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Sim — seu preço alcança o valor calculado para a meta de 15%."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Mantenha a quantidade de horas usada no cálculo e acompanhe se seus clientes aceitam o preço."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "Abaixo de R$ 61,08 por hora você vende no prejuízo. Seu preço de R$ 150,00 cobre o custo.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 61,08",
      "tone": "positive"
    },
    {
      "key": "hidden_cost",
      "title": "2 · A conta que ninguém faz",
      "body": "Sua estrutura custa R$ 46,19 por hora. Somando R$ 10,00 de material usado diretamente, o custo total chega a R$ 56,19.",
      "emphasisLabel": "Lucro por hora",
      "emphasisValue": "R$ 81,81",
      "tone": "positive"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "Há folga; valide a aceitação do mercado.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "Acima da meta",
      "tone": "positive"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Para cobrir seus custos fixos (pró-labore incluído), sua meta é de 47 horas por mês, 11 por semana e 3 por dia.",
      "emphasisLabel": "Meta mensal",
      "emphasisValue": "47 horas",
      "tone": "positive"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto eu consigo dar sem destruir minha margem?",
      "body": "Arraste e veja o preço, a margem e o lucro mudarem — e onde está o seu limite.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "59%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 15000,
    "unitCostCents": 5619,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 1500,
    "minimumPriceCents": 6108
  },
  "schemaVersion": 3,
  "calculationVersion": 2,
  "contentVersion": 4
}
$report$::jsonb
);

select public.create_service_diagnosis_report(
  p_submission_id => '11000000-0000-4000-8000-000000000002'::uuid,
  p_pricing_method => 'appointment'::public.service_pricing_method,
  p_desired_monthly_income_cents => 400000::bigint,
  p_fixed_monthly_expenses_cents => 200000::bigint,
  p_work_hours_period => 'day'::public.service_work_hours_period,
  p_work_period_minutes => 360::integer,
  p_monthly_work_minutes => 7794::integer,
  p_weekly_work_days => 5::smallint,
  p_hourly_rate_cents => 0::bigint,
  p_minute_rate_cents => 0::bigint,
  p_appointment_rate_cents => 5700::bigint,
  p_appointment_duration_minutes => 60::integer,
  p_material_unit_cost_cents => 0::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 3::smallint,
  p_calculation_version => 2::smallint,
  p_content_version => 4::smallint,
  p_scenario => 'appointment'::text,
  p_current_price_cents => 5700::bigint,
  p_real_margin_basis_points => 1096::integer,
  p_unit_profit_cents => 625::bigint,
  p_verdict => 'tight_margin'::text,
  p_priority => 'margin'::text,
  p_unit => 'appointment'::text,
  p_report_snapshot => $report$
{
  "category": "service",
  "scenario": "appointment",
  "currency": "BRL",
  "unit": "appointment",
  "policy": {
    "targetMarginBasisPoints": 1500,
    "weeklyDivisorHundredths": 433,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": true
  },
  "inputs": {
    "desiredMonthlyIncomeCents": 400000,
    "fixedMonthlyExpensesCents": 200000,
    "monthlyWorkMinutes": 7794,
    "weeklyWorkDays": 5,
    "hourlyRateCents": 0,
    "minuteRateCents": 0,
    "appointmentRateCents": 5700,
    "appointmentDurationMinutes": 60,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200,
    "workHoursPeriod": "day",
    "workPeriodMinutes": 360,
    "materialUnitCostCents": 0
  },
  "results": {
    "monthlyCostCents": 600000,
    "hourCostCents": 4619,
    "unitCostCents": 4619,
    "currentPriceCents": 5700,
    "netRevenueCents": 5244,
    "unitProfitCents": 625,
    "realMarginBasisPoints": 1096,
    "minimumPriceCents": 5021,
    "targetPriceCents": 5999,
    "monthlySalesGoal": 115,
    "weeklySalesGoal": 27,
    "dailySalesGoal": 6,
    "breakEvenDiscountPercent": 12,
    "priority": "margin",
    "structureUnitCostCents": 4619,
    "materialUnitCostCents": 0,
    "unitContributionCents": 5244,
    "verdict": "tight_margin"
  },
  "executiveSummary": {
    "headline": "Seu serviço dá lucro?",
    "introduction": "Veja quanto sobra do valor cobrado e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Abaixo da meta",
      "body": "O preço paga os gastos, mas ainda sobra menos que a meta de 15%.",
      "tone": "warning"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "10,96%",
        "referenceLabel": "Meta",
        "referenceValue": "15%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 57,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 59,99"
      }
    ],
    "priority": {
      "label": "Quanto sobra",
      "body": "O serviço dá lucro, mas ainda sobra menos que a meta de 15%. Reveja o preço e os gastos em conjunto."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Sim — sobram R$ 6,25 por atendimento depois de pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Quase — o preço paga os gastos, mas ainda não alcança a meta de 15%."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Ajuste o preço ou os gastos para chegar à meta de 15%."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "Abaixo de R$ 50,21 por atendimento você vende no prejuízo. Seu preço de R$ 57,00 cobre o custo.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 50,21",
      "tone": "positive"
    },
    {
      "key": "hidden_cost",
      "title": "2 · A conta que ninguém faz",
      "body": "Só 129,9h/mês são realmente pagas — é sobre elas que caem seus custos de estrutura. Por isso a hora custa R$ 46,19, não o que você imagina. É com esse número que a conta fecha.",
      "emphasisLabel": "Lucro por atendimento",
      "emphasisValue": "R$ 6,25",
      "tone": "positive"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "O preço cobre os custos, mas sobra menos que o desejado.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "Margem apertada",
      "tone": "warning"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Para cobrir seus custos fixos (pró-labore incluído), sua meta é de 115 atendimentos por mês, 27 por semana e 6 por dia.",
      "emphasisLabel": "Meta mensal",
      "emphasisValue": "115 atendimentos",
      "tone": "positive"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto eu consigo dar sem destruir minha margem?",
      "body": "Arraste e veja o preço, a margem e o lucro mudarem — e onde está o seu limite.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "12%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 5700,
    "unitCostCents": 4619,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 1500,
    "minimumPriceCents": 5021
  },
  "schemaVersion": 3,
  "calculationVersion": 2,
  "contentVersion": 4
}
$report$::jsonb
);

select public.create_service_diagnosis_report(
  p_submission_id => '11000000-0000-4000-8000-000000000003'::uuid,
  p_pricing_method => 'minute'::public.service_pricing_method,
  p_desired_monthly_income_cents => 400000::bigint,
  p_fixed_monthly_expenses_cents => 200000::bigint,
  p_work_hours_period => 'month'::public.service_work_hours_period,
  p_work_period_minutes => 7794::integer,
  p_monthly_work_minutes => 7794::integer,
  p_weekly_work_days => 5::smallint,
  p_hourly_rate_cents => 0::bigint,
  p_minute_rate_cents => 100::bigint,
  p_appointment_rate_cents => 0::bigint,
  p_appointment_duration_minutes => 60::integer,
  p_material_unit_cost_cents => 6000::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 3::smallint,
  p_calculation_version => 2::smallint,
  p_content_version => 4::smallint,
  p_scenario => 'minute'::text,
  p_current_price_cents => 6000::bigint,
  p_real_margin_basis_points => -8498::integer,
  p_unit_profit_cents => -5099::bigint,
  p_verdict => 'direct_loss'::text,
  p_priority => 'cost'::text,
  p_unit => 'appointment'::text,
  p_report_snapshot => $report$
{
  "category": "service",
  "scenario": "minute",
  "currency": "BRL",
  "unit": "appointment",
  "policy": {
    "targetMarginBasisPoints": 1500,
    "weeklyDivisorHundredths": 433,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": true
  },
  "inputs": {
    "desiredMonthlyIncomeCents": 400000,
    "fixedMonthlyExpensesCents": 200000,
    "monthlyWorkMinutes": 7794,
    "weeklyWorkDays": 5,
    "hourlyRateCents": 0,
    "minuteRateCents": 100,
    "appointmentRateCents": 0,
    "appointmentDurationMinutes": 60,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200,
    "workHoursPeriod": "month",
    "workPeriodMinutes": 7794,
    "materialUnitCostCents": 6000
  },
  "results": {
    "monthlyCostCents": 600000,
    "hourCostCents": 4619,
    "unitCostCents": 10619,
    "currentPriceCents": 6000,
    "netRevenueCents": 5520,
    "unitProfitCents": -5099,
    "realMarginBasisPoints": -8498,
    "minimumPriceCents": 11543,
    "targetPriceCents": 13791,
    "monthlySalesGoal": null,
    "weeklySalesGoal": null,
    "dailySalesGoal": null,
    "breakEvenDiscountPercent": 0,
    "priority": "cost",
    "structureUnitCostCents": 4619,
    "materialUnitCostCents": 6000,
    "unitContributionCents": -480,
    "verdict": "direct_loss"
  },
  "executiveSummary": {
    "headline": "Seu serviço dá lucro?",
    "introduction": "Veja quanto sobra do valor cobrado e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Venda com prejuízo",
      "body": "O valor recebido, depois das taxas, não paga nem os materiais usados no serviço. Fazer mais serviços nessas condições aumenta o prejuízo.",
      "tone": "critical"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "-84,98%",
        "referenceLabel": "Meta",
        "referenceValue": "15%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 60,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 137,91"
      }
    ],
    "priority": {
      "label": "Gastos",
      "body": "Os gastos estão deixando pouco dinheiro em cada venda. Comece pelos maiores e veja quais podem ser reduzidos."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Não — faltam R$ 50,99 por atendimento para pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Não — para pagar todos os gastos, o preço precisa ser pelo menos R$ 115,43."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Revise os maiores gastos antes de buscar mais vendas."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "Abaixo de R$ 115,43 por atendimento você vende no prejuízo. Seu preço de R$ 60,00 não cobre o custo.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 115,43",
      "tone": "critical"
    },
    {
      "key": "hidden_cost",
      "title": "2 · A conta que ninguém faz",
      "body": "Sua estrutura custa R$ 46,19 por atendimento. Somando R$ 60,00 de material usado diretamente, o custo total chega a R$ 106,19.",
      "emphasisLabel": "Lucro por atendimento",
      "emphasisValue": "-R$ 50,99",
      "tone": "critical"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "O preço líquido não cobre o material e as taxas da venda.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "Prejuízo direto",
      "tone": "critical"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Seu preço líquido não cobre o material e as taxas. Corrija o custo ou o preço antes de buscar mais volume.",
      "emphasisLabel": null,
      "emphasisValue": null,
      "tone": "critical"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto eu consigo dar sem destruir minha margem?",
      "body": "Arraste e veja o preço, a margem e o lucro mudarem — e onde está o seu limite.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "0%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 6000,
    "unitCostCents": 10619,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 1500,
    "minimumPriceCents": 11543
  },
  "schemaVersion": 3,
  "calculationVersion": 2,
  "contentVersion": 4
}
$report$::jsonb
);

-- Produtos para revenda: preço saudável, margem apertada e prejuízo direto.
select public.create_product_diagnosis_report(
  p_submission_id => '12000000-0000-4000-8000-000000000001'::uuid,
  p_purchase_unit_cost_cents => 5000::bigint,
  p_unit_sale_price_cents => 15000::bigint,
  p_fixed_monthly_expenses_cents => 100000::bigint,
  p_monthly_sales_volume => 100::integer,
  p_pro_labore_included => true::boolean,
  p_pro_labore_cents => 200000::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 1::smallint,
  p_calculation_version => 1::smallint,
  p_content_version => 2::smallint,
  p_scenario => 'resale'::text,
  p_current_price_cents => 15000::bigint,
  p_real_margin_basis_points => 3867::integer,
  p_unit_profit_cents => 5800::bigint,
  p_verdict => 'above_target'::text,
  p_priority => 'volume'::text,
  p_unit => 'unit'::text,
  p_report_snapshot => $report$
{
  "category": "product",
  "scenario": "resale",
  "currency": "BRL",
  "unit": "unit",
  "policy": {
    "targetMarginBasisPoints": 2000,
    "weeklyDivisorHundredths": 433,
    "operatingDaysPerWeek": 6,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": true
  },
  "inputs": {
    "purchaseUnitCostCents": 5000,
    "unitSalePriceCents": 15000,
    "fixedMonthlyExpensesCents": 100000,
    "monthlySalesVolume": 100,
    "proLaboreIncluded": true,
    "proLaboreCents": 200000,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200
  },
  "results": {
    "effectiveFixedCostCents": 300000,
    "purchaseUnitCostCents": 5000,
    "fixedAllocationCents": 3000,
    "totalUnitCostCents": 8000,
    "currentPriceCents": 15000,
    "netRevenueCents": 13800,
    "unitContributionCents": 8800,
    "unitProfitCents": 5800,
    "realMarginBasisPoints": 3867,
    "minimumPriceCents": 8696,
    "targetPriceCents": 11112,
    "priceReferencesPartial": false,
    "monthlySalesGoal": 35,
    "weeklySalesGoal": 9,
    "dailySalesGoal": 2,
    "breakEvenDiscountPercent": 42,
    "verdict": "above_target",
    "priority": "volume"
  },
  "executiveSummary": {
    "headline": "Seu produto dá lucro?",
    "introduction": "Veja quanto sobra de cada venda e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Acima da meta",
      "body": "O preço paga todos os gastos e passa da meta de 20%. Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
      "tone": "positive"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "38,67%",
        "referenceLabel": "Meta",
        "referenceValue": "20%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 150,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 111,12"
      }
    ],
    "priority": {
      "label": "Quantidade de vendas",
      "body": "O preço alcança a meta. Agora mantenha a quantidade de vendas usada no cálculo."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Sim — sobram R$ 58,00 por unidade depois de pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Sim — seu preço alcança o valor calculado para a meta de 20%."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Acompanhe se seus clientes aceitam o preço e mantenha as vendas."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "O preço mínimo de R$ 86,96 por unidade inclui o custo de compra, as taxas e o rateio dos custos fixos.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 86,96",
      "tone": "positive"
    },
    {
      "key": "hidden_cost",
      "title": "2 · O custo escondido da unidade",
      "body": "Além do custo de compra, cada unidade recebe R$ 30,00 de custos fixos rateados. O custo total por unidade chega a R$ 80,00.",
      "emphasisLabel": "Custo total por unidade",
      "emphasisValue": "R$ 80,00",
      "tone": "neutral"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "A margem real supera a meta de 20%; valide o preço no mercado e mantenha o volume.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "38,67%",
      "tone": "positive"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Com a contribuição por unidade atual, a referência é 35 unidades por mês, 9 por semana e 2 por dia, considerando 6 dias de operação por semana.",
      "emphasisLabel": "Meta mensal",
      "emphasisValue": "35 unidades",
      "tone": "positive"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto cabe no produto?",
      "body": "A simulação completa mostra como cada desconto altera o lucro por unidade e a margem real, já considerando o rateio dos custos fixos.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "42%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 15000,
    "unitCostCents": 8000,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 2000,
    "minimumPriceCents": 8696,
    "partial": false
  },
  "schemaVersion": 1,
  "calculationVersion": 1,
  "contentVersion": 2
}
$report$::jsonb
);

select public.create_product_diagnosis_report(
  p_submission_id => '12000000-0000-4000-8000-000000000002'::uuid,
  p_purchase_unit_cost_cents => 5000::bigint,
  p_unit_sale_price_cents => 10000::bigint,
  p_fixed_monthly_expenses_cents => 100000::bigint,
  p_monthly_sales_volume => 100::integer,
  p_pro_labore_included => true::boolean,
  p_pro_labore_cents => 200000::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 1::smallint,
  p_calculation_version => 1::smallint,
  p_content_version => 2::smallint,
  p_scenario => 'resale'::text,
  p_current_price_cents => 10000::bigint,
  p_real_margin_basis_points => 1200::integer,
  p_unit_profit_cents => 1200::bigint,
  p_verdict => 'tight_margin'::text,
  p_priority => 'margin'::text,
  p_unit => 'unit'::text,
  p_report_snapshot => $report$
{
  "category": "product",
  "scenario": "resale",
  "currency": "BRL",
  "unit": "unit",
  "policy": {
    "targetMarginBasisPoints": 2000,
    "weeklyDivisorHundredths": 433,
    "operatingDaysPerWeek": 6,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": true
  },
  "inputs": {
    "purchaseUnitCostCents": 5000,
    "unitSalePriceCents": 10000,
    "fixedMonthlyExpensesCents": 100000,
    "monthlySalesVolume": 100,
    "proLaboreIncluded": true,
    "proLaboreCents": 200000,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200
  },
  "results": {
    "effectiveFixedCostCents": 300000,
    "purchaseUnitCostCents": 5000,
    "fixedAllocationCents": 3000,
    "totalUnitCostCents": 8000,
    "currentPriceCents": 10000,
    "netRevenueCents": 9200,
    "unitContributionCents": 4200,
    "unitProfitCents": 1200,
    "realMarginBasisPoints": 1200,
    "minimumPriceCents": 8696,
    "targetPriceCents": 11112,
    "priceReferencesPartial": false,
    "monthlySalesGoal": 72,
    "weeklySalesGoal": 17,
    "dailySalesGoal": 3,
    "breakEvenDiscountPercent": 13,
    "verdict": "tight_margin",
    "priority": "margin"
  },
  "executiveSummary": {
    "headline": "Seu produto dá lucro?",
    "introduction": "Veja quanto sobra de cada venda e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Abaixo da meta",
      "body": "Cada unidade dá lucro, mas ainda sobra menos que a meta de 20%.",
      "tone": "warning"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "12%",
        "referenceLabel": "Meta",
        "referenceValue": "20%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 100,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 111,12"
      }
    ],
    "priority": {
      "label": "Quanto sobra",
      "body": "A venda dá lucro, mas ainda sobra menos que a meta de 20%. Reveja o preço e os gastos em conjunto."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Sim — sobram R$ 12,00 por unidade depois de pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Quase — o preço paga os gastos, mas ainda não alcança a meta de 20%."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Ajuste o preço ou os gastos para chegar à meta de 20%."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "O preço mínimo de R$ 86,96 por unidade inclui o custo de compra, as taxas e o rateio dos custos fixos.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 86,96",
      "tone": "positive"
    },
    {
      "key": "hidden_cost",
      "title": "2 · O custo escondido da unidade",
      "body": "Além do custo de compra, cada unidade recebe R$ 30,00 de custos fixos rateados. O custo total por unidade chega a R$ 80,00.",
      "emphasisLabel": "Custo total por unidade",
      "emphasisValue": "R$ 80,00",
      "tone": "neutral"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "A unidade gera lucro, mas a margem real ainda está abaixo da meta de 20%.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "12%",
      "tone": "warning"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Com a contribuição por unidade atual, a referência é 72 unidades por mês, 17 por semana e 3 por dia, considerando 6 dias de operação por semana.",
      "emphasisLabel": "Meta mensal",
      "emphasisValue": "72 unidades",
      "tone": "positive"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto cabe no produto?",
      "body": "A simulação completa mostra como cada desconto altera o lucro por unidade e a margem real, já considerando o rateio dos custos fixos.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "13%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 10000,
    "unitCostCents": 8000,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 2000,
    "minimumPriceCents": 8696,
    "partial": false
  },
  "schemaVersion": 1,
  "calculationVersion": 1,
  "contentVersion": 2
}
$report$::jsonb
);

select public.create_product_diagnosis_report(
  p_submission_id => '12000000-0000-4000-8000-000000000003'::uuid,
  p_purchase_unit_cost_cents => 12000::bigint,
  p_unit_sale_price_cents => 10000::bigint,
  p_fixed_monthly_expenses_cents => 100000::bigint,
  p_monthly_sales_volume => 100::integer,
  p_pro_labore_included => false::boolean,
  p_pro_labore_cents => 0::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 1::smallint,
  p_calculation_version => 1::smallint,
  p_content_version => 2::smallint,
  p_scenario => 'resale'::text,
  p_current_price_cents => 10000::bigint,
  p_real_margin_basis_points => -3800::integer,
  p_unit_profit_cents => -3800::bigint,
  p_verdict => 'direct_loss'::text,
  p_priority => 'cost'::text,
  p_unit => 'unit'::text,
  p_report_snapshot => $report$
{
  "category": "product",
  "scenario": "resale",
  "currency": "BRL",
  "unit": "unit",
  "policy": {
    "targetMarginBasisPoints": 2000,
    "weeklyDivisorHundredths": 433,
    "operatingDaysPerWeek": 6,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": false
  },
  "inputs": {
    "purchaseUnitCostCents": 12000,
    "unitSalePriceCents": 10000,
    "fixedMonthlyExpensesCents": 100000,
    "monthlySalesVolume": 100,
    "proLaboreIncluded": false,
    "proLaboreCents": 0,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200
  },
  "results": {
    "effectiveFixedCostCents": 100000,
    "purchaseUnitCostCents": 12000,
    "fixedAllocationCents": 1000,
    "totalUnitCostCents": 13000,
    "currentPriceCents": 10000,
    "netRevenueCents": 9200,
    "unitContributionCents": -2800,
    "unitProfitCents": -3800,
    "realMarginBasisPoints": -3800,
    "minimumPriceCents": 14131,
    "targetPriceCents": 18056,
    "priceReferencesPartial": false,
    "monthlySalesGoal": null,
    "weeklySalesGoal": null,
    "dailySalesGoal": null,
    "breakEvenDiscountPercent": 0,
    "verdict": "direct_loss",
    "priority": "cost"
  },
  "executiveSummary": {
    "headline": "Seu produto dá lucro?",
    "introduction": "Veja quanto sobra de cada venda e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Venda com prejuízo",
      "body": "O valor recebido, depois das taxas, não paga o custo de compra. Vender mais nessas condições aumenta o prejuízo.",
      "tone": "critical"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "-38%",
        "referenceLabel": "Meta",
        "referenceValue": "20%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 100,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 180,56"
      }
    ],
    "priority": {
      "label": "Custo do produto",
      "body": "O custo de compra usa todo o valor que sobra da venda. Tente reduzir esse custo ou aumentar o preço antes de vender mais."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Não — faltam R$ 28,00 por unidade para pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Não — para pagar todos os gastos, o preço precisa ser pelo menos R$ 141,31."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Reduza o custo de compra ou aumente o preço antes de vender mais."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "O preço mínimo de R$ 141,31 por unidade inclui o custo de compra, as taxas e o rateio dos custos fixos.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 141,31",
      "tone": "critical"
    },
    {
      "key": "hidden_cost",
      "title": "2 · O custo escondido da unidade",
      "body": "Além do custo de compra, cada unidade recebe R$ 10,00 de custos fixos rateados. O custo total por unidade chega a R$ 130,00.",
      "emphasisLabel": "Custo total por unidade",
      "emphasisValue": "R$ 130,00",
      "tone": "neutral"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "A receita líquida não cobre o custo de compra. Corrija custo ou preço antes de buscar volume.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "-38%",
      "tone": "critical"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Corrija o custo de compra ou o preço antes de buscar volume. Vender mais unidades nas condições atuais aumenta a perda, mesmo operando 6 dias por semana.",
      "emphasisLabel": null,
      "emphasisValue": null,
      "tone": "critical"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto cabe no produto?",
      "body": "A simulação completa mostra como cada desconto altera o lucro por unidade e a margem real, já considerando o rateio dos custos fixos.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "0%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 10000,
    "unitCostCents": 13000,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 2000,
    "minimumPriceCents": 14131,
    "partial": false
  },
  "schemaVersion": 1,
  "calculationVersion": 1,
  "contentVersion": 2
}
$report$::jsonb
);

-- Produção própria: preço saudável, margem apertada e prejuízo direto.
select public.create_production_diagnosis_report(
  p_submission_id => '13000000-0000-4000-8000-000000000001'::uuid,
  p_cost_composition_enabled => true::boolean,
  p_production_unit_cost_cents => 5000::bigint,
  p_material_unit_cost_cents => 3000::bigint,
  p_packaging_unit_cost_cents => 500::bigint,
  p_direct_labor_unit_cost_cents => 1000::bigint,
  p_other_variable_unit_cost_cents => 500::bigint,
  p_unit_sale_price_cents => 15000::bigint,
  p_fixed_monthly_expenses_cents => 100000::bigint,
  p_monthly_sales_volume => 100::integer,
  p_pro_labore_included => true::boolean,
  p_pro_labore_cents => 200000::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 1::smallint,
  p_calculation_version => 1::smallint,
  p_content_version => 2::smallint,
  p_scenario => 'manufacturing'::text,
  p_current_price_cents => 15000::bigint,
  p_real_margin_basis_points => 3867::integer,
  p_unit_profit_cents => 5800::bigint,
  p_verdict => 'above_target'::text,
  p_priority => 'volume'::text,
  p_unit => 'unit'::text,
  p_report_snapshot => $report$
{
  "category": "production",
  "scenario": "manufacturing",
  "currency": "BRL",
  "unit": "unit",
  "policy": {
    "targetMarginBasisPoints": 2000,
    "weeklyDivisorHundredths": 433,
    "operatingDaysPerWeek": 6,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": true
  },
  "inputs": {
    "costCompositionEnabled": true,
    "productionUnitCostCents": 5000,
    "materialUnitCostCents": 3000,
    "packagingUnitCostCents": 500,
    "directLaborUnitCostCents": 1000,
    "otherVariableUnitCostCents": 500,
    "unitSalePriceCents": 15000,
    "fixedMonthlyExpensesCents": 100000,
    "monthlySalesVolume": 100,
    "proLaboreIncluded": true,
    "proLaboreCents": 200000,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200
  },
  "results": {
    "effectiveFixedCostCents": 300000,
    "productionUnitCostCents": 5000,
    "fixedAllocationCents": 3000,
    "totalUnitCostCents": 8000,
    "currentPriceCents": 15000,
    "netRevenueCents": 13800,
    "unitContributionCents": 8800,
    "unitProfitCents": 5800,
    "realMarginBasisPoints": 3867,
    "minimumPriceCents": 8696,
    "targetPriceCents": 11112,
    "priceReferencesPartial": false,
    "monthlySalesGoal": 35,
    "weeklySalesGoal": 9,
    "dailySalesGoal": 2,
    "breakEvenDiscountPercent": 42,
    "verdict": "above_target",
    "priority": "volume"
  },
  "executiveSummary": {
    "headline": "Sua produção dá lucro?",
    "introduction": "Veja quanto sobra de cada unidade vendida e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Acima da meta",
      "body": "O preço paga todos os gastos e passa da meta de 20%. Acompanhe se seus clientes aceitam o preço e mantenha as vendas.",
      "tone": "positive"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "38,67%",
        "referenceLabel": "Meta",
        "referenceValue": "20%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 150,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 111,12"
      }
    ],
    "priority": {
      "label": "Quantidade de vendas",
      "body": "O preço alcança a meta. Agora mantenha a quantidade de vendas usada no cálculo."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Sim — sobram R$ 58,00 por unidade depois de pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Sim — seu preço alcança o valor calculado para a meta de 20%."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Acompanhe se seus clientes aceitam o preço e mantenha as vendas."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "O preço mínimo de R$ 86,96 por unidade inclui o custo de fabricação, as taxas e o rateio dos custos fixos.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 86,96",
      "tone": "positive"
    },
    {
      "key": "hidden_cost",
      "title": "2 · O custo escondido da unidade",
      "body": "A mão de obra direta integra o custo de fabricação; o pró-labore integra os custos fixos e não deve ser contado novamente. Além do custo de fabricação, cada unidade recebe R$ 30,00 de custos fixos rateados. O custo total por unidade chega a R$ 80,00.",
      "emphasisLabel": "Custo total por unidade",
      "emphasisValue": "R$ 80,00",
      "tone": "neutral"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "A margem real supera a meta de 20%; valide o preço no mercado e mantenha o volume.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "38,67%",
      "tone": "positive"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Com a contribuição por unidade atual, a referência é 35 unidades por mês, 9 por semana e 2 por dia, considerando 6 dias de operação por semana.",
      "emphasisLabel": "Meta mensal",
      "emphasisValue": "35 unidades",
      "tone": "positive"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto cabe na produção?",
      "body": "A simulação completa mostra como cada desconto altera o lucro por unidade e a margem real, já considerando o rateio dos custos fixos.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "42%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 15000,
    "unitCostCents": 8000,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 2000,
    "minimumPriceCents": 8696,
    "partial": false
  },
  "schemaVersion": 1,
  "calculationVersion": 1,
  "contentVersion": 2
}
$report$::jsonb
);

select public.create_production_diagnosis_report(
  p_submission_id => '13000000-0000-4000-8000-000000000002'::uuid,
  p_cost_composition_enabled => false::boolean,
  p_production_unit_cost_cents => 5000::bigint,
  p_material_unit_cost_cents => null::bigint,
  p_packaging_unit_cost_cents => null::bigint,
  p_direct_labor_unit_cost_cents => null::bigint,
  p_other_variable_unit_cost_cents => null::bigint,
  p_unit_sale_price_cents => 10000::bigint,
  p_fixed_monthly_expenses_cents => 100000::bigint,
  p_monthly_sales_volume => 100::integer,
  p_pro_labore_included => true::boolean,
  p_pro_labore_cents => 200000::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 1::smallint,
  p_calculation_version => 1::smallint,
  p_content_version => 2::smallint,
  p_scenario => 'manufacturing'::text,
  p_current_price_cents => 10000::bigint,
  p_real_margin_basis_points => 1200::integer,
  p_unit_profit_cents => 1200::bigint,
  p_verdict => 'tight_margin'::text,
  p_priority => 'margin'::text,
  p_unit => 'unit'::text,
  p_report_snapshot => $report$
{
  "category": "production",
  "scenario": "manufacturing",
  "currency": "BRL",
  "unit": "unit",
  "policy": {
    "targetMarginBasisPoints": 2000,
    "weeklyDivisorHundredths": 433,
    "operatingDaysPerWeek": 6,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": true
  },
  "inputs": {
    "costCompositionEnabled": false,
    "productionUnitCostCents": 5000,
    "materialUnitCostCents": null,
    "packagingUnitCostCents": null,
    "directLaborUnitCostCents": null,
    "otherVariableUnitCostCents": null,
    "unitSalePriceCents": 10000,
    "fixedMonthlyExpensesCents": 100000,
    "monthlySalesVolume": 100,
    "proLaboreIncluded": true,
    "proLaboreCents": 200000,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200
  },
  "results": {
    "effectiveFixedCostCents": 300000,
    "productionUnitCostCents": 5000,
    "fixedAllocationCents": 3000,
    "totalUnitCostCents": 8000,
    "currentPriceCents": 10000,
    "netRevenueCents": 9200,
    "unitContributionCents": 4200,
    "unitProfitCents": 1200,
    "realMarginBasisPoints": 1200,
    "minimumPriceCents": 8696,
    "targetPriceCents": 11112,
    "priceReferencesPartial": false,
    "monthlySalesGoal": 72,
    "weeklySalesGoal": 17,
    "dailySalesGoal": 3,
    "breakEvenDiscountPercent": 13,
    "verdict": "tight_margin",
    "priority": "margin"
  },
  "executiveSummary": {
    "headline": "Sua produção dá lucro?",
    "introduction": "Veja quanto sobra de cada unidade vendida e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Abaixo da meta",
      "body": "Cada unidade dá lucro, mas ainda sobra menos que a meta de 20%.",
      "tone": "warning"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "12%",
        "referenceLabel": "Meta",
        "referenceValue": "20%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 100,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 111,12"
      }
    ],
    "priority": {
      "label": "Quanto sobra",
      "body": "A venda dá lucro, mas ainda sobra menos que a meta de 20%. Reveja o preço e os gastos em conjunto."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Sim — sobram R$ 12,00 por unidade depois de pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Quase — o preço paga os gastos, mas ainda não alcança a meta de 20%."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Ajuste o preço ou os gastos para chegar à meta de 20%."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "O preço mínimo de R$ 86,96 por unidade inclui o custo de fabricação, as taxas e o rateio dos custos fixos.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 86,96",
      "tone": "positive"
    },
    {
      "key": "hidden_cost",
      "title": "2 · O custo escondido da unidade",
      "body": "O custo de fabricação foi informado de forma resumida, sem detalhamento dos componentes. Além do custo de fabricação, cada unidade recebe R$ 30,00 de custos fixos rateados. O custo total por unidade chega a R$ 80,00.",
      "emphasisLabel": "Custo total por unidade",
      "emphasisValue": "R$ 80,00",
      "tone": "neutral"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "A unidade gera lucro, mas a margem real ainda está abaixo da meta de 20%.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "12%",
      "tone": "warning"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Com a contribuição por unidade atual, a referência é 72 unidades por mês, 17 por semana e 3 por dia, considerando 6 dias de operação por semana.",
      "emphasisLabel": "Meta mensal",
      "emphasisValue": "72 unidades",
      "tone": "positive"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto cabe na produção?",
      "body": "A simulação completa mostra como cada desconto altera o lucro por unidade e a margem real, já considerando o rateio dos custos fixos.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "13%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 10000,
    "unitCostCents": 8000,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 2000,
    "minimumPriceCents": 8696,
    "partial": false
  },
  "schemaVersion": 1,
  "calculationVersion": 1,
  "contentVersion": 2
}
$report$::jsonb
);

select public.create_production_diagnosis_report(
  p_submission_id => '13000000-0000-4000-8000-000000000003'::uuid,
  p_cost_composition_enabled => true::boolean,
  p_production_unit_cost_cents => 12000::bigint,
  p_material_unit_cost_cents => 8000::bigint,
  p_packaging_unit_cost_cents => 1000::bigint,
  p_direct_labor_unit_cost_cents => 2000::bigint,
  p_other_variable_unit_cost_cents => 1000::bigint,
  p_unit_sale_price_cents => 10000::bigint,
  p_fixed_monthly_expenses_cents => 100000::bigint,
  p_monthly_sales_volume => 100::integer,
  p_pro_labore_included => false::boolean,
  p_pro_labore_cents => 0::bigint,
  p_tax_rate_basis_points => 600::integer,
  p_card_fee_rate_basis_points => 200::integer,
  p_schema_version => 1::smallint,
  p_calculation_version => 1::smallint,
  p_content_version => 2::smallint,
  p_scenario => 'manufacturing'::text,
  p_current_price_cents => 10000::bigint,
  p_real_margin_basis_points => -3800::integer,
  p_unit_profit_cents => -3800::bigint,
  p_verdict => 'direct_loss'::text,
  p_priority => 'cost'::text,
  p_unit => 'unit'::text,
  p_report_snapshot => $report$
{
  "category": "production",
  "scenario": "manufacturing",
  "currency": "BRL",
  "unit": "unit",
  "policy": {
    "targetMarginBasisPoints": 2000,
    "weeklyDivisorHundredths": 433,
    "operatingDaysPerWeek": 6,
    "maximumDiscountPercent": 50,
    "proLaboreIncluded": false
  },
  "inputs": {
    "costCompositionEnabled": true,
    "productionUnitCostCents": 12000,
    "materialUnitCostCents": 8000,
    "packagingUnitCostCents": 1000,
    "directLaborUnitCostCents": 2000,
    "otherVariableUnitCostCents": 1000,
    "unitSalePriceCents": 10000,
    "fixedMonthlyExpensesCents": 100000,
    "monthlySalesVolume": 100,
    "proLaboreIncluded": false,
    "proLaboreCents": 0,
    "taxRateBasisPoints": 600,
    "cardFeeRateBasisPoints": 200
  },
  "results": {
    "effectiveFixedCostCents": 100000,
    "productionUnitCostCents": 12000,
    "fixedAllocationCents": 1000,
    "totalUnitCostCents": 13000,
    "currentPriceCents": 10000,
    "netRevenueCents": 9200,
    "unitContributionCents": -2800,
    "unitProfitCents": -3800,
    "realMarginBasisPoints": -3800,
    "minimumPriceCents": 14131,
    "targetPriceCents": 18056,
    "priceReferencesPartial": false,
    "monthlySalesGoal": null,
    "weeklySalesGoal": null,
    "dailySalesGoal": null,
    "breakEvenDiscountPercent": 0,
    "verdict": "direct_loss",
    "priority": "cost"
  },
  "executiveSummary": {
    "headline": "Sua produção dá lucro?",
    "introduction": "Veja quanto sobra de cada unidade vendida e o que merece sua atenção primeiro.",
    "verdict": {
      "label": "Venda com prejuízo",
      "body": "O valor recebido, depois das taxas, não paga o custo de fabricação. Vender mais nessas condições aumenta o prejuízo.",
      "tone": "critical"
    },
    "facts": [
      {
        "key": "margin",
        "currentLabel": "Quanto sobra a cada R$ 100",
        "currentValue": "-38%",
        "referenceLabel": "Meta",
        "referenceValue": "20%"
      },
      {
        "key": "price",
        "currentLabel": "Preço atual",
        "currentValue": "R$ 100,00",
        "referenceLabel": "Preço para alcançar a meta",
        "referenceValue": "R$ 180,56"
      }
    ],
    "priority": {
      "label": "Custo de fabricação",
      "body": "O custo de fabricação usa todo o valor que sobra da venda. Tente reduzir esse custo ou aumentar o preço antes de vender mais."
    },
    "answers": [
      {
        "key": "profitability",
        "question": "Estou ganhando dinheiro?",
        "answer": "Não — faltam R$ 28,00 por unidade para pagar os gastos considerados."
      },
      {
        "key": "price_sufficiency",
        "question": "Estou cobrando o preço certo?",
        "answer": "Não — para pagar todos os gastos, o preço precisa ser pelo menos R$ 141,31."
      },
      {
        "key": "immediate_action",
        "question": "O que preciso fazer agora?",
        "answer": "Reduza o custo de fabricação ou aumente o preço antes de vender mais."
      }
    ]
  },
  "sections": [
    {
      "key": "break_even",
      "title": "1 · Ponto de equilíbrio",
      "body": "O preço mínimo de R$ 141,31 por unidade inclui o custo de fabricação, as taxas e o rateio dos custos fixos.",
      "emphasisLabel": "Preço mínimo",
      "emphasisValue": "R$ 141,31",
      "tone": "critical"
    },
    {
      "key": "hidden_cost",
      "title": "2 · O custo escondido da unidade",
      "body": "A mão de obra direta integra o custo de fabricação; o pró-labore integra os custos fixos e não deve ser contado novamente. Além do custo de fabricação, cada unidade recebe R$ 10,00 de custos fixos rateados. O custo total por unidade chega a R$ 130,00.",
      "emphasisLabel": "Custo total por unidade",
      "emphasisValue": "R$ 130,00",
      "tone": "neutral"
    },
    {
      "key": "margin_diagnosis",
      "title": "3 · Diagnóstico da margem",
      "body": "A receita líquida não cobre o custo de fabricação. Corrija custo ou preço antes de buscar volume.",
      "emphasisLabel": "Margem real",
      "emphasisValue": "-38%",
      "tone": "critical"
    },
    {
      "key": "sales_goal",
      "title": "Meta de vendas",
      "body": "Corrija o custo de fabricação ou o preço antes de buscar volume. Vender mais unidades nas condições atuais aumenta a perda, mesmo operando 6 dias por semana.",
      "emphasisLabel": null,
      "emphasisValue": null,
      "tone": "critical"
    },
    {
      "key": "discount_simulator",
      "title": "Quanto de desconto cabe na produção?",
      "body": "A simulação completa mostra como cada desconto altera o lucro por unidade e a margem real, já considerando o rateio dos custos fixos.",
      "emphasisLabel": "Limite antes do prejuízo",
      "emphasisValue": "0%",
      "tone": "neutral"
    }
  ],
  "discountSimulationBase": {
    "originalPriceCents": 10000,
    "unitCostCents": 13000,
    "totalFeeBasisPoints": 800,
    "targetMarginBasisPoints": 2000,
    "minimumPriceCents": 14131,
    "partial": false
  },
  "schemaVersion": 1,
  "calculationVersion": 1,
  "contentVersion": 2
}
$report$::jsonb
);

commit;
