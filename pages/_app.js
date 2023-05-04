import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <script
          src="https://kit.fontawesome.com/33b391a425.js"
          crossOrigin="anonymous">
        </script>
      </Head>

      <Header />

      <main>
        <div className='container'>
          <Component {...pageProps} />
        </div>
      </main>
      
      <Footer />
    </>
  )
}
