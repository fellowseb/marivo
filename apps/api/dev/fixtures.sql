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

INSERT INTO plays (
    title,
    uri,
    created_date,
    last_modified_date,
    creator_id,
    owner_id
) VALUES (
    'Crime, comptines et châtiments',
    'dc3ee1d4-e04e-47ea-9634-f516b5abb6df',
    now(),
    now(),
    1,
    1
);

INSERT INTO plays (
    title,
    uri,
    created_date,
    last_modified_date,
    creator_id,
    owner_id
) VALUES (
    'The Mousetrap',
    '520b0c24-cdc7-4907-a631-eb4e2965c322',
    now()- interval '1 day',
    now()- interval '1 day',
    1,
    1
);

INSERT INTO plays (
    title,
    uri,
    created_date,
    last_modified_date,
    creator_id,
    owner_id
) VALUES (
    'Huit femmes',
    '60a5d6b2-8b28-465d-bdb7-57433d8834f5',
    now() + interval '1 day',
    now() + interval '1 day',
    1,
    2
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
      "stagingNotesWrite": true,
      "blockingRead": true,
      "blockingWrite": true,
      "memorizeRead": true,
      "planningRead": true,
      "planningWrite": true,
      "settingsRead": false,
      "settingsWrite": false}'::jsonb
);

INSERT INTO roles (
    name,
    play_id,
    permissions
) VALUES (
    'Comedian',
    3,
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

INSERT INTO users_in_plays (
    user_id,
    play_id,
    joined_date
) VALUES (
    2,
    1,
    now()
);

INSERT INTO users_in_plays (
    user_id,
    play_id,
    role_id,
    joined_date
) VALUES (
    2,
    2,
    1,
    now()
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
    3,
    'pending',
    now(),
    2
);
