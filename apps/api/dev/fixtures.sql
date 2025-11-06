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
    checksum
) VALUES (
    '5233fe860bdb4f5698293515eb257def'
);

INSERT INTO lines (
    id,
    script_id,
    type,
    heading_level,
    text,
    checksum
) VALUES (
    '3eef33c9-81b3-45ef-9775-fc7e65ec7373',
    1,
    'heading',
    0,
    'Crime, Comptines et Châtiment',
    '8504cfdd2da34ffb8c25f448d09d3a59'
);

INSERT INTO lines (
    id,
    script_id,
    type,
    characters,
    text,
    checksum,
    version,
    previous_versions_ids
) VALUES (
    '0838fecc-28b0-4d3c-86ac-7cb88afeb0d6',
    1,
    'chartext',
    '{"LA MÈRE"}',
    '(sert)
C est le cabillaud',
    '089f55cba4654dd68991ba90cd0be513',
    3,
    '{dc0f8ddf-2cda-4b05-92cd-115a9dacac61,4c8cf22a-7e17-4b8c-af2d-61b166fa710b}'
);

INSERT INTO lines (
    id,
    script_id,
    type,
    characters,
    text,
    checksum,
    version
) VALUES (
    'dc0f8ddf-2cda-4b05-92cd-115a9dacac61',
    1,
    'chartext',
    '{"LA MÈRE"}',
    '(sert à manger)
C est le cabillaud',
    'db74fc5ad446472296c01b1b30cb7c7e',
    2
);

INSERT INTO lines (
    id,
    script_id,
    type,
    characters,
    text,
    checksum,
    version
) VALUES (
    '4c8cf22a-7e17-4b8c-af2d-61b166fa710b',
    1,
    'chartext',
    '{"LA MÈRE"}',
    '(sert à manger)
C est le cabillaud !!! Humm !!!',
    '1c949136597e4d2abda48d2189581f6d',
    1
);

UPDATE scripts
    SET checksum = '9c6b488519c84afca2c5e675fbde55b5',
        lines_order = '{3eef33c9-81b3-45ef-9775-fc7e65ec7373,0838fecc-28b0-4d3c-86ac-7cb88afeb0d6}'
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
      "settingsRead": false,
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


