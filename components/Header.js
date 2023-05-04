export default function Header() {
    return (
        <header>
            <div className='container'>
                <a id='blog-ref' href='/'>
                    <div className='blog-avatar'></div>
                    <div className='blog-name'>
                        Adarlan Teixeira
                    </div>
                </a>
                <nav>
                    <a href='/about'>
                        About
                    </a>
                    <a href='/'>
                        Blog
                    </a>
                    <a target="_blank"
                        rel="noopener noreferrer"
                        href="https://github.com/adarlan/plankton">
                        Plankton
                    </a>
                </nav>
            </div>
        </header>
    )
}