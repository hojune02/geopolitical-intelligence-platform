-- GDELT's coder also processes pages that are not news articles: tag,
-- author and topic pages, pagination links, home pages and section
-- listings (e.g. a restaurant guide's /taste/chefs/ page produced 31
-- "consultations" between London, Seoul, Bangkok and Chicago).
-- Flag them once, at write time, so insights can leave them out.

CREATE OR REPLACE FUNCTION gip_is_listing_url(url text) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $fn$
  SELECT CASE WHEN url IS NULL THEN false ELSE (
    WITH p AS (
      SELECT
        lower(trim(both '/' from regexp_replace(regexp_replace(url, '^https?://[^/]+', ''), '[?#].*$', ''))) AS path,
        lower(coalesce(substring(url from '\?([^#]*)'), '')) AS q
    )
    SELECT
      -- a home page with no article parameter
      (path = '' AND q !~ '(^|&)(p|id|articleid|article_id|news_id|story|storyid|post)=')
      -- tag, author, topic, about... pages: the marker is last, or followed by one id-free segment
      OR path ~ '(^|/)(tag|tags|author|authors|category|categories|topic|topics|people|contributors|about|about-us|contact|contact-us|faq|search|offices|terms|terms-service|terms-of-service|privacy|privacy-policy|editorial-standards|artist|discountcodes)(/[^/0-9]+)?$'
      -- pagination and archive listings
      OR q ~ '(^|&)(before|offset|page|updated-max|max-results)='
      -- plural section listings such as /taste/chefs or /city/business
      OR (q = '' AND path ~ '^[a-z]+(/[a-z]+)?$' AND path ~ '[a-z]{3,}s$')
    FROM p
  ) END
$fn$;

ALTER TABLE gdelt_events
  ADD COLUMN IF NOT EXISTS listing_source boolean
  GENERATED ALWAYS AS (gip_is_listing_url(source_url)) STORED;
