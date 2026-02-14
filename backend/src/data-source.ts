import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  ssl: false,
});
