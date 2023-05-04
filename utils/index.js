import matter from 'gray-matter'
import fs from 'fs'

export const sortPostsByDate = (a, b) => {
    return new Date(b.frontmatter.date) - new Date(a.frontmatter.date)
}

export default function initializePost(post, filepath, fullContent) {
    const mdFile = fs.readFileSync(filepath, 'utf-8')
    const {data: frontmatter, content} = matter(mdFile)
    // let title = ""
    let excerpt = ""
    const lines = content.split(/\r?\n/)
    for (const i in lines) {
      const line = lines[i].trim()
    //   if (title == "" && line.startsWith("# ")) {
    //       title = line.substring(2)
    //       continue
    //   }
    //   if (title != "" && line != "") {
      if (line != "") {
            excerpt = (excerpt + ' ' + line).trim()
      }
      if (excerpt != "" && line == "") {
          break
      }
    }
    // post['title'] = title
    if (fullContent)
        post['content'] = content
    else
        post['excerpt'] = excerpt
    post['frontmatter'] = frontmatter
}
