import fs from 'fs'
import path from 'path'
import Post from '../components/Post'
import Head from 'next/head'
import initializePost from '../utils'

export default function PostPage({post}) {
  return (
    <>
      <Head>
        <title>Adarlan Teixeira - {post.frontmatter.title}</title>
      </Head>
      <Post post={post} />
    </>
  )
}

export async function getStaticPaths() {
  const files = fs.readdirSync(path.join('posts'))

  const paths = files.map((filename) => ({
    params: {
      slug: filename.replace('.md', ''),
    },
  }))

  return {
    paths,
    fallback: false,
  }
}

export async function getStaticProps({ params: { slug } }) {
  const filepath = path.join('posts', slug + '.md')
  const post = {slug}
  initializePost(post, filepath, true)
  return {
    props: {
      post,
    },
  }
}