create table public.report_ai_conversations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  diagnosis_id bigint not null references public.diagnoses (id) on delete cascade,
  report_version integer not null,
  summary text not null default '',
  summary_through_turn bigint,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint report_ai_conversations_version_check check (report_version >= 0),
  constraint report_ai_conversations_summary_check check (
    char_length(summary) <= 12000
  ),
  constraint report_ai_conversations_user_report_version_key
    unique (user_id, diagnosis_id, report_version),
  constraint report_ai_conversations_id_user_key unique (id, user_id)
);

create table public.report_ai_turns (
  id bigint generated always as identity primary key,
  conversation_id bigint not null,
  user_id uuid not null,
  request_id uuid not null,
  question text not null,
  answer text,
  status text not null,
  counts_toward_quota boolean not null default true,
  model text not null,
  input_tokens integer,
  cached_input_tokens integer,
  output_tokens integer,
  error_code text,
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  constraint report_ai_turns_conversation_user_fkey
    foreign key (conversation_id, user_id)
    references public.report_ai_conversations (id, user_id)
    on delete cascade,
  constraint report_ai_turns_user_request_key unique (user_id, request_id),
  constraint report_ai_turns_question_check check (
    question = btrim(question)
    and char_length(question) between 1 and 2000
  ),
  constraint report_ai_turns_status_check check (
    status in ('pending', 'completed', 'failed')
  ),
  constraint report_ai_turns_model_check check (
    char_length(model) between 1 and 100
  ),
  constraint report_ai_turns_token_check check (
    (input_tokens is null or input_tokens >= 0)
    and (cached_input_tokens is null or cached_input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
  ),
  constraint report_ai_turns_shape_check check (
    (
      status = 'pending'
      and answer is null
      and error_code is null
      and completed_at is null
    )
    or (
      status = 'completed'
      and nullif(btrim(answer), '') is not null
      and error_code is null
      and completed_at is not null
    )
    or (
      status = 'failed'
      and answer is null
      and nullif(error_code, '') is not null
      and completed_at is not null
    )
  )
);

create index report_ai_conversations_user_report_versions_idx
on public.report_ai_conversations (
  user_id,
  diagnosis_id,
  report_version desc
);

create index report_ai_conversations_diagnosis_idx
on public.report_ai_conversations (diagnosis_id);

create index report_ai_turns_conversation_created_idx
on public.report_ai_turns (conversation_id, created_at desc, id desc);

create index report_ai_turns_user_quota_idx
on public.report_ai_turns (user_id, created_at)
where counts_toward_quota;

revoke all on table public.report_ai_conversations from anon, authenticated;
revoke all on table public.report_ai_turns from anon, authenticated;
revoke all on sequence public.report_ai_conversations_id_seq
from anon, authenticated;
revoke all on sequence public.report_ai_turns_id_seq from anon, authenticated;

grant select on table public.report_ai_conversations to authenticated;
grant select on table public.report_ai_turns to authenticated;

alter table public.report_ai_conversations enable row level security;
alter table public.report_ai_turns enable row level security;

create policy report_ai_conversations_select_own
on public.report_ai_conversations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy report_ai_turns_select_own
on public.report_ai_turns
for select
to authenticated
using ((select auth.uid()) = user_id);
