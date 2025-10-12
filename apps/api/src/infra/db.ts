import postgres from 'postgres';

const sql = postgres({
  transform: {
    // Avoid the automagic snake_case to camelCase transforms
    // ...postgres.camel,
    undefined: null,
  },
  host: 'localhost',
  port: 5432,
  database: 'marivo',
  username: 'seb',
  password: '',
});

export default sql;
