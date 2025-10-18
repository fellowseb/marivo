INSERT INTO users (
    clerk_id
) VALUES (
    'user_33RCa4UgZwkczOcYLkp16CZw7g9'
);

INSERT INTO users (
    clerk_id
) VALUES (
    'user_34D1o5Yq6fQVJZjxILmVY2Y3VXv'
);

INSERT INTO plays (
    title,
    uri,
    created_date,
    created_by,
    owned_by
) VALUES (
    'Crime, comptines et châtiments',
    'crime-comptines-ef83b2c695d0',
    now(),
    1,
    1
);

INSERT INTO plays (
    title,
    uri,
    created_date,
    created_by,
    owned_by
) VALUES (
    'The Mousetrap',
    'mousetrap-ef83b2c695d0',
    now()- interval '1 day',
    1,
    1
);

INSERT INTO plays (
    title,
    uri,
    created_date,
    created_by,
    owned_by
) VALUES (
    'Huit femmes',
    'huit-femmes-ef83b2c695d0',
    now() + interval '1 day',
    1,
    2
);

INSERT INTO roles (
    name,
    play_id
) VALUES (
    'Comedian',
    1
);

INSERT INTO roles (
    name,
    play_id
) VALUES (
    'Comedian',
    2
);

INSERT INTO users_in_plays (
    user_id,
    play_id
) VALUES (
    2,
    1
);

INSERT INTO users_in_plays (
    user_id,
    play_id,
    role
) VALUES (
    2,
    2,
    1
);

INSERT INTO users_in_plays (
    user_id,
    play_id
) VALUES (
    1,
    3
);
