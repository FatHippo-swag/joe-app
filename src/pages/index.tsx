import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Note-Taking App</title>
        <meta name="description" content="A simple note-taking application" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to your Note-Taking App</h1>
        <p className={styles.description}>Get started by taking some notes!</p>
        <Link href="/notes" className={styles.button}>
          Go to Notes
        </Link>
      </main>
    </div>
  );
}