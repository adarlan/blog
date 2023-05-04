export default function PostMetadata({post}) {
    return post.frontmatter.hasOwnProperty('tags') ?
    (
        <div className='metadata'>
            <p className="date">
                Posted by Adarlan Teixeira on {new Date(post.frontmatter.date).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
            </p>
            <p className="tags">
                {post.frontmatter.tags.map((tag, index) => (
                    <span key={index} className='tag'>{tag}</span>
                ))}
            </p>
        </div>
    ) :
    (<></>)
}