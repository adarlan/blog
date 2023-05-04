export default function PostCover({post}) {
    return post.frontmatter.hasOwnProperty('cover') ?
    (
        <div className='cover' style={{backgroundImage: 'url(' + post.frontmatter.cover + ')'}} />
    ) :
    (<></>)
}
