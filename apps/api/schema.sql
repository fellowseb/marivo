DROP VIEW IF EXISTS user_plays_view;
DROP VIEW IF EXISTS user_pending_invites_view;
DROP TABLE IF EXISTS users_in_plays;
DROP TABLE IF EXISTS invites;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS plays;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS public_domain_plays;
DROP TYPE invite_status_enum;

CREATE TABLE users (
    id                      integer         PRIMARY KEY 
                                            GENERATED ALWAYS AS IDENTITY,
    clerk_id                varchar(32)     UNIQUE 
                                            NOT NULL,
    username                varchar(80)     NOT NULL,
    full_name               varchar(80)     NOT NULL,
    primary_email           varchar(100)    NOT NULL,
    profile_picture         varchar(1024)
);

CREATE TABLE public_domain_plays (
    id                      integer         PRIMARY KEY
                                            GENERATED ALWAYS AS IDENTITY,
    uri                     varchar(36)     NOT NULL
                                            UNIQUE,
    title                   varchar(100)    NOT NULL,
    author                  varchar(64)     NOT NULL,
    lang                    varchar(2)      NOT NULL,
    script                  text            NOT NULL
);

CREATE TABLE plays (
    id                      integer         PRIMARY KEY
                                            GENERATED ALWAYS AS IDENTITY,
    uri                     varchar(36)     NOT NULL
                                            UNIQUE,
    title                   varchar(100)    NOT NULL,
    created_date            timestamp(0)    NOT NULL,
    creator_id              integer         REFERENCES users(id) 
                                            ON DELETE SET NULL,
    owner_id                integer         NOT NULL
                                            REFERENCES users(id),
    last_modified_date      timestamp(0),
    public_domain_play_src  integer         REFERENCES public_domain_plays(id)
                                            ON DELETE SET NULL,
    external_synced_src     varchar(2048)
);

CREATE TABLE roles (
    id                      integer         PRIMARY KEY
                                            GENERATED ALWAYS AS IDENTITY,
    name                    varchar(32)     NOT NULL,
    play_id                 integer         NOT NULL
                                            REFERENCES plays(id)
                                            ON DELETE CASCADE
);

CREATE TYPE invite_status_enum AS ENUM ('pending', 'rejected', 'accepted', 'error');

CREATE TABLE invites (
    uri                     varchar(36)           NOT NULL
                                                  UNIQUE,
    invited_email           varchar(100)          ,
    invited_user_id         integer               REFERENCES users(id)
                                                  ON DELETE CASCADE,
    play_id                 integer               NOT NULL 
                                                  REFERENCES plays(id)
                                                  ON DELETE CASCADE,
    status                  invite_status_enum    NOT NULL,
    sent_date               timestamp(0)          NOT NULL,

    CONSTRAINT one_invite_per_play_per_email UNIQUE (invited_email, invited_user_id, play_id),
    CONSTRAINT invited_email_or_user_id_not_null CHECK (invited_email is NOT NULL OR invited_user_id is NOT NULL)
);

CREATE TABLE users_in_plays (
    user_id                 integer         NOT NULL
                                            REFERENCES users(id)
                                            ON DELETE CASCADE,
    play_id                 integer         NOT NULL 
                                            REFERENCES plays(id)
                                            ON DELETE CASCADE,
    role                    integer         REFERENCES roles(id)
                                            ON DELETE SET NULL,
    joined_date             timestamp(0)    NOT NULL,

    CONSTRAINT one_user_to_play_assoc UNIQUE (user_id, play_id)
);

CREATE VIEW user_plays_view AS
    (SELECT
        p.id,
        p.title,
        p.uri,
        p.created_date,
        p.last_modified_date,
        p.owner_id AS user_id,
        o.username AS owner_username,
        o.full_name AS owner_full_name,
        'owner' AS user_role
    FROM plays p
        JOIN users o ON o.id = p.owner_id)
    UNION
    (SELECT
        p.id,
        p.title,
        p.uri,
        p.created_date,
        p.last_modified_date,
        up.user_id,
        o.username AS owner_username,
        o.full_name AS owner_full_name,
        'participant' AS user_role
    FROM users_in_plays up
        JOIN plays p ON p.id = up.play_id
        JOIN users o ON o.id = p.owner_id
    ORDER BY created_date DESC);

CREATE VIEW user_pending_invites_view AS (
 SELECT i.sent_date, i.uri, i.invited_user_id, o.username as owner_username, o.full_name as owner_full_name, p.title
 FROM invites i
   JOIN plays p ON i.play_id = p.id
   JOIN users o ON p.owner_id = o.id
 WHERE i.status = 'pending' AND i.invited_user_id IS NOT null
 ORDER BY i.sent_date DESC
);
