CREATE TABLE gdelt_events (
    id TEXT PRIMARY KEY,

    event_date DATE NOT NULL,
    added_at TIMESTAMPTZ NOT NULL,

    actor1_code TEXT,
    actor1_name TEXT,
    actor1_country_code TEXT,

    actor2_code TEXT,
    actor2_name TEXT,
    actor2_country_code TEXT,

    event_code TEXT NOT NULL,
    event_base_code TEXT NOT NULL,
    event_root_code TEXT NOT NULL,

    quad_class SMALLINT NOT NULL
        CHECK (quad_class BETWEEN 1 AND 4),

    goldstein_scale DOUBLE PRECISION NOT NULL
        CHECK (goldstein_scale BETWEEN -10 AND 10),

    is_root_event BOOLEAN NOT NULL,

    num_mentions INTEGER NOT NULL
        CHECK (num_mentions >= 0),

    num_sources INTEGER NOT NULL
        CHECK (num_sources >= 0),

    num_articles INTEGER NOT NULL
        CHECK (num_articles >= 0),

    avg_tone DOUBLE PRECISION NOT NULL
        CHECK (avg_tone BETWEEN -100 AND 100),

    location_name TEXT,
    location_country_code TEXT,

    latitude DOUBLE PRECISION
        CHECK (
            latitude IS NULL
            OR latitude BETWEEN -90 AND 90
        ),

    longitude DOUBLE PRECISION
        CHECK (
            longitude IS NULL
            OR longitude BETWEEN -180 AND 180
        ),

    source_url TEXT,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    CHECK (
        (latitude IS NULL AND longitude IS NULL)
        OR
        (latitude IS NOT NULL AND longitude IS NOT NULL)
    )
);

CREATE INDEX idx_gdelt_events_event_date
    ON gdelt_events (event_date DESC);

CREATE INDEX idx_gdelt_events_added_at
    ON gdelt_events (added_at DESC);

CREATE INDEX idx_gdelt_events_quad_class
    ON gdelt_events (quad_class);

CREATE INDEX idx_gdelt_events_goldstein
    ON gdelt_events (goldstein_scale);

CREATE INDEX idx_gdelt_events_country_date
    ON gdelt_events (
        location_country_code,
        event_date DESC
    );

CREATE INDEX idx_gdelt_events_coordinates
    ON gdelt_events (
        latitude,
        longitude
    );

CREATE TABLE ingestion_batches (
    export_url TEXT PRIMARY KEY,

    status TEXT NOT NULL
        CHECK (
            status IN (
                'processing',
                'completed'
            )
        ),

    total_rows INTEGER NOT NULL
        CHECK (total_rows >= 0),

    accepted_rows INTEGER NOT NULL
        CHECK (accepted_rows >= 0),

    rejected_rows INTEGER NOT NULL
        CHECK (rejected_rows >= 0),

    persisted_events INTEGER NOT NULL
        DEFAULT 0
        CHECK (persisted_events >= 0),

    ingested_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW()
);