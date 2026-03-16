update public.content_resources
set value_text = '한 사건을 여러 사람이 끊김 없이 함께 풀어가는 협업 시스템',
    published_at = now(),
    updated_at = now()
where namespace = 'landing'
  and resource_key = 'hero.title'
  and locale = 'ko-KR'
  and organization_id is null
  and status = 'published';

update public.content_resources
set value_text = '실무자는 업무 흐름에 맞춰 빠르게 일하고, 의뢰인은 자기 사건의 진행 상황과 필요한 요청을 한눈에 확인할 수 있습니다.',
    published_at = now(),
    updated_at = now()
where namespace = 'landing'
  and resource_key = 'hero.subtitle'
  and locale = 'ko-KR'
  and organization_id is null
  and status = 'published';