INSERT INTO theatrical_genres (
    key
) VALUES ('comedy'), ('drama'), ('tragedy'), ('tragicomedy'), ('vaudeville');

INSERT INTO theatrical_periods (
    key
) VALUES ('ancient_greek'),
('ancient_roman'),
('medieval'),
('renaissance'),
('elizabethan'),
('neoclassical'),
('xviiith'),
('romanticism'),
('realism'),
('naturalism'),
('symbolism'),
('modernism'),
('expressionism'),
('theatre_of_the_absurd'),
('epic_theatre'),
('postmodern'),
('contemporary');

INSERT INTO users (
    clerk_id,
    username,
    full_name,
    primary_email
) VALUES (
    'user_33RCa4UgZwkczOcYLkp16CZw7g9',
    'fellowseb',
    'Sébastien Wauquier',
    'wauquier.sebastien@gmail.com'
);

INSERT INTO users (
    clerk_id,
    username,
    full_name,
    primary_email
) VALUES (
    'user_34D1o5Yq6fQVJZjxILmVY2Y3VXv',
    'johndoe',
    'John Doe',
    'lespetitsbateaux@gmail.com'
);

INSERT INTO scripts (
    checksum,
    characters
) VALUES (
    '5233fe860bdb4f5698293515eb257def',
    '{"47fb7b92-8f82-470e-8ce8-bce37fed1661": "LA MÈRE", "ad69fb0d-dd9e-4ac9-882d-ec3167956484": "LE PÈRE"}'::jsonb
);

INSERT INTO lines (
    id,
    script_id,
    type
) VALUES (
    '3eef33c9-81b3-45ef-9775-fc7e65ec7373',
    1,
    'heading'
);

INSERT INTO lines_contents (
    id,
    script_id,
    type,
    line_id,
    line_type,
    heading_level,
    text,
    checksum,
    version,
    author_id
) VALUES (
    '12ab60c1-5b0b-475d-96c0-c68baa4769a2',
    1,
    'saved_version',
    '3eef33c9-81b3-45ef-9775-fc7e65ec7373',
    'heading',
    0,
    'Crime, Comptines et Châtiment',
    '8504cfdd2da34ffb8c25f448d09d3a59',
    1,
    1
);

INSERT INTO lines (
    id,
    script_id,
    type
) VALUES (
    '0838fecc-28b0-4d3c-86ac-7cb88afeb0d6',
    1,
    'chartext'
);

INSERT INTO lines_contents (
    id,
    script_id,
    type,
    line_id,
    line_type,
    characters,
    text,
    checksum,
    version,
    author_id
) VALUES (
    '0d89a4ee-99e4-44d4-a056-66df1be7638f',
    1,
    'saved_version',
    '0838fecc-28b0-4d3c-86ac-7cb88afeb0d6',
    'chartext',
    '{47fb7b92-8f82-470e-8ce8-bce37fed1661}',
    '(sert)
C est le cabillaud',
    '089f55cba4654dd68991ba90cd0be513',
    3,
    2
);

INSERT INTO lines_contents (
    id,
    script_id,
    type,
    line_id,
    line_type,
    characters,
    text,
    checksum,
    version,
    author_id
) VALUES (
    '411638cf-418b-4c6b-834f-08a05941d0cc',
    1,
    'saved_version',
    '0838fecc-28b0-4d3c-86ac-7cb88afeb0d6',
    'chartext',
    '{47fb7b92-8f82-470e-8ce8-bce37fed1661}',
    '(sert à manger)
C est le cabillaud',
    'db74fc5ad446472296c01b1b30cb7c7e',
    2,
    1
);

INSERT INTO lines_contents (
    id,
    script_id,
    type,
    line_id,
    line_type,
    characters,
    text,
    checksum,
    version,
    author_id
) VALUES (
    'a67b990b-ce44-4efe-a721-93d0604fe19c',
    1,
    'saved_version',
    '0838fecc-28b0-4d3c-86ac-7cb88afeb0d6',
    'chartext',
    '{47fb7b92-8f82-470e-8ce8-bce37fed1661}',
    '(sert à manger)
C est le cabillaud !!! Humm !!!',
    '1c949136597e4d2abda48d2189581f6d',
    1,
    1
);

INSERT INTO lines (
    id,
    script_id,
    type
) VALUES (
    '1f1953d6-d926-4d87-86af-25a12e1c46d5',
    1,
    'chartext'
);

INSERT INTO lines_contents (
    id,
    script_id,
    type,
    line_id,
    line_type,
    characters,
    text,
    checksum,
    version,
    author_id
) VALUES (
    'e4927214-1ddd-4f0f-add6-d8cf93eec626',
    1,
    'saved_version',
    '1f1953d6-d926-4d87-86af-25a12e1c46d5',
    'chartext',
    '{ad69fb0d-dd9e-4ac9-882d-ec3167956484}',
    'Miam !',
    '089f55cba4654dd68991ba90cd0be513',
    1,
    2
);

INSERT INTO lines_contents (
    id,
    script_id,
    type,
    line_id,
    line_type,
    characters,
    text,
    checksum,
    author_id
) VALUES (
    '9e213279-d561-4ff2-9df1-714f3cc703a6',
    1,
    'shared_draft',
    '1f1953d6-d926-4d87-86af-25a12e1c46d5',
    'chartext',
    '{ad69fb0d-dd9e-4ac9-882d-ec3167956484}',
    'Manngerrrrr !',
    '9e213279d5614ff29df1714f3cc703a6',
    1
);

UPDATE scripts
    SET checksum = '9c6b488519c84afca2c5e675fbde55b5',
        lines_order = '{3eef33c9-81b3-45ef-9775-fc7e65ec7373,0838fecc-28b0-4d3c-86ac-7cb88afeb0d6,1f1953d6-d926-4d87-86af-25a12e1c46d5}'
    WHERE id = 1;

INSERT INTO plays (
    title,
    uri,
    created_date,
    last_modified_date,
    creator_id,
    owner_id,
    script_id
) VALUES (
    'Huit femmes',
    '60a5d6b2-8b28-465d-bdb7-57433d8834f5',
    now() + interval '1 day',
    now() + interval '1 day',
    1,
    2,
    1
);

INSERT INTO roles (
    name,
    play_id,
    permissions
) VALUES (
    'Comedian',
    1,
      '{"scriptRead": true,
      "scriptWriteSharedDrafts": true,
      "scriptWrite": true,
      "stagingNotesRead": true,
      "stagingNotesWrite": false,
      "blockingRead": true,
      "blockingWrite": false,
      "memorizeRead": true,
      "planningRead": true,
      "planningWrite": false,
      "settingsRead": true,
      "settingsWrite": false}'::jsonb
);

INSERT INTO invites (
    uri,
    invited_user_id,
    play_id,
    status,
    sent_date,
    role_id
) VALUES (
    '26a0c7b0-8809-4178-8cf5-5edea6d1c6ee',
    1,
    1,
    'pending',
    now(),
    1
);



-- A public-domain collection entry so the "from collection" flow has data
INSERT INTO scripts (
    checksum,
    characters,
    lines_order
) VALUES (
    '9f2c1a77e4b34d0aa1c2e5f60718293b',
    '{"11111111-1111-4111-8111-111111111111": "ALICE", "22222222-2222-4222-8222-222222222222": "BOB"}'::jsonb,
    ARRAY['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd']::uuid[]
);

INSERT INTO lines (
    id,
    script_id,
    type
) VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    2,
    'heading'
);

INSERT INTO lines_contents (
    id,
    script_id,
    type,
    line_id,
    line_type,
    heading_level,
    text,
    checksum,
    version,
    author_id
) VALUES (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    2,
    'saved_version',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'heading',
    1,
    'The Fixture Play',
    'cccccccccccccccccccccccccccccccc',
    1,
    1
);

INSERT INTO lines (
    id,
    script_id,
    type
) VALUES (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    2,
    'chartext'
);

INSERT INTO lines_contents (
    id,
    script_id,
    type,
    line_id,
    line_type,
    characters,
    text,
    checksum,
    version,
    author_id
) VALUES (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    2,
    'saved_version',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'chartext',
    '{11111111-1111-4111-8111-111111111111}',
    'Hello from the collection fixture.',
    'ffffffffffffffffffffffffffffffff',
    1,
    1
);

INSERT INTO public_domain_plays (
    uri,
    title,
    author,
    lang,
    number_of_roles,
    number_of_male_roles,
    number_of_female_roles,
    genre,
    period,
    synopsis,
    script_id
) VALUES (
    '99999999-9999-4999-8999-999999999999',
    'The Fixture Play',
    'Fixture Author',
    'en',
    2,
    1,
    1,
    'comedy',
    'contemporary',
    'A small synopsis for the fixture play, used by the collection UI tests.',
    2
);
