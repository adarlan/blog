import PostMetadata from './PostMetadata'
import {marked} from 'marked'

export default function Post({post}) {
    return (
        <>
            <article>
                <div className='content-container'>
                    <h1>{post.frontmatter.title}</h1>
                    <PostMetadata post={post} />
                    <div>
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(post.content) }}></div>
                    </div>
                </div>
            </article>
        </>
    )
}