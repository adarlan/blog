import PostMetadata from './PostMetadata'

export default function PostAbstract({post}) {
    return (
        <section>
            <div className='content-container'>
                <h2>
                    <a href={`/${post.slug}`}>{post.frontmatter.title}</a>
                </h2>
                <PostMetadata post={post} />
                <p>
                    {post.excerpt} <a href={`/${post.slug}`}>Read more...</a>
                </p>
            </div>
        </section>
    )
}