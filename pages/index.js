import fs from 'fs'
import path from 'path'
import PostAbstract from '../components/PostAbstract'
import { sortPostsByDate } from '../utils'
import Head from 'next/head'
import initializePost from '../utils'

export default function Index({posts}) {
  return (
    <>
      <Head>
        <title>Adarlan Teixeira - Posts</title>
      </Head>
      {
        posts.map((post, index) => (
          <PostAbstract key={index} post={post} />
        ))
      }
    </>
  )
}

export async function getStaticProps() {
  const files = fs.readdirSync(path.join('posts'))
  const posts = files.map(filename => {
    const filepath = path.join('posts', filename)
    const slug = filename.replace('.md', '')
    const post = {slug}
    initializePost(post, filepath, false)
    return post
  }).filter(post => !post.frontmatter.hasOwnProperty('index') || post.frontmatter.index)
  return {
    props: {
      posts: posts.sort(sortPostsByDate)
    }
  }
}