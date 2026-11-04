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







-- Public-domain collection fixtures: 54 scripts by Marivaux, Molière and Shakespeare
-- (light fake line content, real metadata) to exercise pagination, filtering and
-- the sticky author groups in the collection UI.
DO $$
DECLARE
  r record;
  sid integer;
  head_id uuid;
  text_id uuid;
  c1 uuid;
  c2 uuid;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('Pierre de Marivaux', 'Le Jeu de l''amour et du hasard', 'fr', 'comedy', 'xviiith', 'Un valet et sa maîtresse échangent leurs rôles pour tester leurs sentiments.', 4, 2, 2),
    ('Pierre de Marivaux', 'Les Fausses Confidences', 'fr', 'comedy', 'xviiith', 'Dorante, amoureux d''Araminte, se fait passer pour un autre via son valet.', 5, 3, 3),
    ('Pierre de Marivaux', 'Le Legs', 'fr', 'comedy', 'xviiith', 'Un valet hérite de tout ce que son maître ne donne pas.', 6, 4, 4),
    ('Pierre de Marivaux', 'La Dispute', 'fr', 'comedy', 'xviiith', 'Quatre jeunes gens débattent pour savoir quel sexe est le plus inconstant.', 7, 5, 2),
    ('Pierre de Marivaux', 'L''Épreuve', 'fr', 'comedy', 'xviiith', 'Un jeune homme prouve sa fidélité en résistant aux avances d''une coquette.', 8, 2, 3),
    ('Pierre de Marivaux', 'La Seconde Surprise', 'fr', 'comedy', 'xviiith', 'La soubrette et le valet trament pour marier leurs maîtres.', 9, 3, 4),
    ('Pierre de Marivaux', 'Le Triomphe de l''amour', 'fr', 'comedy', 'xviiith', 'Sur l''île de la Dispute, l''Amour règne en maître.', 10, 4, 2),
    ('Pierre de Marivaux', 'L''Île des esclaves', 'fr', 'comedy', 'xviiith', 'Maîtres et valets échangent leurs places sur une île.', 11, 5, 3),
    ('Pierre de Marivaux', 'La Double Inconstance', 'fr', 'comedy', 'xviiith', 'Deux amants inconstants se piègent mutuellement.', 4, 2, 4),
    ('Pierre de Marivaux', 'Arlequin poli par l''amour', 'fr', 'comedy', 'xviiith', 'Arlequin devient spirituel pour séduire une bergère.', 5, 3, 2),
    ('Pierre de Marivaux', 'Le Prince travesti', 'fr', 'comedy', 'xviiith', 'Un prince déguisé teste la vertu d''une princesse.', 6, 4, 3),
    ('Pierre de Marivaux', 'La Colonie', 'fr', 'comedy', 'xviiith', 'Hommes et femmes d''une colonie se disputent le pouvoir.', 7, 5, 4),
    ('Pierre de Marivaux', 'Les Acteurs de bonne foi', 'fr', 'comedy', 'xviiith', 'Une troupe d''amateurs répète une pièce dans le désordre.', 8, 2, 2),
    ('Pierre de Marivaux', 'Le Menteur', 'fr', 'comedy', 'xviiith', 'Dorante ment avec talent pour séduire deux femmes.', 9, 3, 3),
    ('Pierre de Marivaux', 'L''Heureux Stratagème', 'fr', 'comedy', 'xviiith', 'Deux amants feignent la rupture pour piéger l''autre.', 10, 4, 4),
    ('Pierre de Marivaux', 'La Serre d''amour', 'fr', 'comedy', 'xviiith', 'Un jardinier amoureux prosecute sa belle.', 11, 5, 2),
    ('Pierre de Marivaux', 'Le Paysan parvenu', 'fr', 'comedy', 'xviiith', 'Jacob monte à Paris et grimpe l''échelle sociale.', 4, 2, 3),
    ('Pierre de Marivaux', 'La Vie de Marianne', 'fr', 'comedy', 'xviiith', 'Les mémoires d''une jeune femme confrontée à l''amour.', 5, 3, 4),
    ('Molière', 'Tartuffe', 'fr', 'comedy', 'xviiith', 'Un faux dévot s''installe chez Orgon et convoite sa maison et sa fille.', 6, 4, 2),
    ('Molière', 'Le Misanthrope', 'fr', 'comedy', 'xviiith', 'Alceste déteste la société et ses compromissions.', 7, 5, 3),
    ('Molière', 'Dom Juan', 'fr', 'comedy', 'xviiith', 'Le séducteur insolentdéfie la morale et le ciel.', 8, 2, 4),
    ('Molière', 'L''Avare', 'fr', 'comedy', 'xviiith', 'Harpagon cache son argent et veut marier ses enfants contre leur gré.', 9, 3, 2),
    ('Molière', 'Le Bourgeois gentilhomme', 'fr', 'comedy', 'xviiith', 'Monsieur Jourdain rêve de noblesse et se fait plumer.', 10, 4, 3),
    ('Molière', 'Les Fourberies de Scapin', 'fr', 'comedy', 'xviiith', 'Scapin tire les ficelles pour marier deux jeunes gens.', 11, 5, 4),
    ('Molière', 'L''École des femmes', 'fr', 'comedy', 'xviiith', 'Arnoldhe veut une épouse ignorante et se fait berner.', 4, 2, 2),
    ('Molière', 'Le Malade imaginaire', 'fr', 'comedy', 'xviiith', 'Argan se croit malade et se fait soigner à outrance.', 5, 3, 3),
    ('Molière', 'Les Précieuses ridicules', 'fr', 'comedy', 'xviiith', 'Deux jeunes filles affectent un langage précieux.', 6, 4, 4),
    ('Molière', 'L''École des maris', 'fr', 'comedy', 'xviiith', 'Deux tuteurs opposés élèvent différemment leurs pupilles.', 7, 5, 2),
    ('Molière', 'Sganarelle ou le Cocu imaginaire', 'fr', 'comedy', 'xviiith', 'Un jaloux croit tout ce qu''on lui dit.', 8, 2, 3),
    ('Molière', 'Le Dépit amoureux', 'fr', 'comedy', 'xviiith', 'Valère et Lucile se brouillent pour une brouille.', 9, 3, 4),
    ('Molière', 'Amphitryon', 'fr', 'comedy', 'xviiith', 'Jupiter usurpe la place d''Amphitryon auprès d''Alcmène.', 10, 4, 2),
    ('Molière', 'George Dandin', 'fr', 'comedy', 'xviiith', 'Un bourgeois épouse une paysanne qui se venge.', 11, 5, 3),
    ('Molière', 'Monsieur de Pourcea', 'fr', 'comedy', 'xviiith', 'On fait croire à un provincial qu''il est atteint de folie.', 4, 2, 4),
    ('Molière', 'Le Mariage forcé', 'fr', 'comedy', 'xviiith', 'Sganarelle veut échapper au mariage par la fuite.', 5, 3, 2),
    ('Molière', 'L''Impromptu de Versailles', 'fr', 'comedy', 'xviiith', 'Molière improvise une pièce devant le Roi.', 6, 4, 3),
    ('Molière', 'La Critique de l''École des femmes', 'fr', 'comedy', 'xviiith', 'Des salonnières critiquent la pièce en la jouant.', 7, 5, 4),
    ('William Shakespeare', 'Hamlet', 'en', 'tragedy', 'elizabethan', 'Le prince de Danemark venge son père assassiné par son oncle.', 8, 2, 2),
    ('William Shakespeare', 'Macbeth', 'en', 'tragedy', 'elizabethan', 'Un général ambitieux bascule dans le meurtre pour le trône.', 9, 3, 3),
    ('William Shakespeare', 'Romeo and Juliet', 'en', 'tragedy', 'elizabethan', 'Deux amants de familles ennemies vivent un amour fatal.', 10, 4, 4),
    ('William Shakespeare', 'Othello', 'en', 'tragedy', 'elizabethan', 'La jalousie d''Iago détruit le mariage d''Othello.', 11, 5, 2),
    ('William Shakespeare', 'King Lear', 'en', 'tragedy', 'elizabethan', 'Un roi déchu sombre dans la folie après avoir chassé sa fille fidèle.', 4, 2, 3),
    ('William Shakespeare', 'The Tempest', 'en', 'tragicomedy', 'elizabethan', 'Un magicien exilé complote sa vengeance sur une île.', 5, 3, 4),
    ('William Shakespeare', 'Twelfth Night', 'en', 'comedy', 'elizabethan', 'Viola, déguisée en garçon, sème la confusion à Illyrie.', 6, 4, 2),
    ('William Shakespeare', 'A Midsummer Night''s Dream', 'en', 'comedy', 'elizabethan', 'Amants et fées se perdent dans une forêt enchantée.', 7, 5, 3),
    ('William Shakespeare', 'Much Ado About Nothing', 'en', 'comedy', 'elizabethan', 'Benedick et Beatrice se détestent avant de s''aimer.', 8, 2, 4),
    ('William Shakespeare', 'As You Like It', 'en', 'comedy', 'elizabethan', 'Rosalinde exilée trouve l''amour dans la forêt d''Arden.', 9, 3, 2),
    ('William Shakespeare', 'Julius Caesar', 'en', 'tragedy', 'elizabethan', 'La conjuration contre César divise Rome.', 10, 4, 3),
    ('William Shakespeare', 'Richard III', 'en', 'tragedy', 'elizabethan', 'Un prince difforme intrigue pour le trône d''Angleterre.', 11, 5, 4),
    ('William Shakespeare', 'Henry V', 'en', 'tragedy', 'elizabethan', 'Le jeune roi mène l''Angleterre à la victoire d''Azincourt.', 4, 2, 2),
    ('William Shakespeare', 'The Merchant of Venice', 'en', 'comedy', 'elizabethan', 'Un marchand prête sa chair pour un ami.', 5, 3, 3),
    ('William Shakespeare', 'Antony and Cleopatra', 'en', 'tragedy', 'elizabethan', 'Le général romain succombe à la reine d''Égypte.', 6, 4, 4),
    ('William Shakespeare', 'Coriolanus', 'en', 'tragedy', 'elizabethan', 'Un héros romain devient son propre ennemi.', 7, 5, 2),
    ('William Shakespeare', 'Titus Andronicus', 'en', 'tragedy', 'elizabethan', 'La vengeance dégénère en bain de sang à Rome.', 8, 2, 3),
    ('William Shakespeare', 'The Winter''s Tale', 'en', 'tragicomedy', 'elizabethan', 'Un roi jaloux sépare sa famille pendant seize ans.', 9, 3, 4)
  ) AS t(author, title, lang, genre, period, synopsis, roles, male, female)
  LOOP
    c1 := gen_random_uuid();
    c2 := gen_random_uuid();
    head_id := gen_random_uuid();
    text_id := gen_random_uuid();
    INSERT INTO scripts (checksum, characters, lines_order)
      VALUES ('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', jsonb_build_object(c1::text, 'HERO', c2::text, 'HEROINE'), ARRAY[head_id, text_id])
      RETURNING id INTO sid;
    INSERT INTO lines (id, script_id, type) VALUES (head_id, sid, 'heading');
    INSERT INTO lines_contents (id, script_id, type, line_id, line_type, heading_level, text, checksum, version, author_id)
      VALUES (gen_random_uuid(), sid, 'saved_version', head_id, 'heading', 1, r.title, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 1, 1);
    INSERT INTO lines (id, script_id, type) VALUES (text_id, sid, 'chartext');
    INSERT INTO lines_contents (id, script_id, type, line_id, line_type, characters, text, checksum, version, author_id)
      VALUES (gen_random_uuid(), sid, 'saved_version', text_id, 'chartext', ARRAY[c1], 'A line of the play.', 'cccccccccccccccccccccccccccccccc', 1, 1);
    INSERT INTO public_domain_plays (uri, title, author, lang, number_of_roles, number_of_male_roles, number_of_female_roles, genre, period, synopsis, script_id)
      VALUES (gen_random_uuid()::varchar, r.title, r.author, r.lang, r.roles, r.male, r.female, r.genre, r.period, r.synopsis, sid);
  END LOOP;
END $$;
