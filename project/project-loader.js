// projects-loader.js

// Project configuration - empty for now
const projectSlugs = [];

// Categories mapping for filtering
const projectCategories = {};

// DOM elements
const projectsGrid = document.getElementById('projects-grid');
const projectDetail = document.getElementById('project-detail');
const projectDetailContent = document.getElementById('project-detail-content');
const backButton = document.getElementById('back-button');
const projectsSection = document.getElementById('projects-section');
const filterButtons = document.querySelectorAll('.filter-btn');

// Function to parse frontmatter from markdown
function parseFrontmatter(markdown) {
    const match = markdown.match(/^---\s*([\s\S]*?)\s*---/);
    if (!match) return { content: markdown };

    const frontmatter = match[1];
    const content = markdown.slice(match[0].length);

    // Parse the frontmatter
    const data = {};
    frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            // Handle arrays in YAML format (like tags)
            if (value.startsWith('[') && value.endsWith(']')) {
                data[key.trim()] = value.slice(1, -1).split(',').map(item =>
                    item.trim().replace(/"/g, '').replace(/'/g, '')
                );
            } else {
                data[key.trim()] = value.replace(/"/g, '').replace(/'/g, '');
            }
        }
    });

    return { frontmatter: data, content };
}

// Create a project card based on markdown data
function createProjectCard(projectData, slug) {
    const div = document.createElement('div');
    div.className = 'project-card';
    div.dataset.categories = projectCategories[slug] ? projectCategories[slug].join(' ') : '';

    // Extract first paragraph for short description
    let shortDescription = '';
    const firstParaMatch = projectData.content.match(/##\s*Project Goals\s*\n\n([^#]+)/);
    if (firstParaMatch) {
        shortDescription = firstParaMatch[1].trim();
    } else {
        // Fallback to first paragraph if no Project Goals section
        const firstPara = projectData.content.split('\n\n')[0];
        shortDescription = firstPara.replace(/^#.*\n/, '').trim();
    }

    // Limit short description length
    if (shortDescription.length > 150) {
        shortDescription = shortDescription.substring(0, 147) + '...';
    }

    // Get the image from the markdown if available
    let imageUrl = 'https://placehold.co/600x400';
    if (projectData.frontmatter.featured_image && !projectData.frontmatter.featured_image.startsWith('#')) {
        imageUrl = projectData.frontmatter.featured_image;
    }

    // Get tags from frontmatter
    const tags = projectData.frontmatter.tags ?
        (typeof projectData.frontmatter.tags === 'string' ?
            projectData.frontmatter.tags.split(',').map(t => t.trim()) :
            projectData.frontmatter.tags.slice(0, 3)) :
        [];

    div.innerHTML = `
        <div class="card">
            <img src="${imageUrl}" alt="${projectData.frontmatter.title}" class="project-image">
            <div class="card-content">
                <h3 class="project-title">${projectData.frontmatter.title}</h3>
                <p class="project-description">${shortDescription}</p>
                <div class="project-tags">
                    ${tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
                </div>
                <a href="#" class="project-link view-project" data-slug="${slug}">
                    View Project <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    `;

    return div;
}

// Function to convert Markdown to HTML (simple version)
function markdownToHtml(markdown) {
    // Replace image references
    let content = markdown.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="width: 100%; height: auto; border-radius: 8px; max-width: 800px; display: block; margin: 20px auto;">');

    // Convert headings
    content = content.replace(/^### (.*$)/gim, '<h3>$1</h3>')
                     .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                     .replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert bold and italic
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                     .replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert lists
    content = content.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
                     .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
                     .replace(/<\/ul>\s*<ul>/g, '');

    // Convert links
    content = content.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Convert image captions
    content = content.replace(/\*\(Caption: (.*?)\)\*/g, '<div class="image-caption">$1</div>');

    // Convert paragraphs (but be careful with existing HTML)
    const paragraphs = content.split('\n\n');
    content = paragraphs.map(p => {
        // Skip if paragraph starts with HTML tag
        if (p.trim().startsWith('<')) return p;
        // Skip empty paragraphs
        if (p.trim() === '') return '';
        // Wrap in paragraph tags
        return `<p>${p}</p>`;
    }).join('\n\n');

    return content;
}

// Load projects from the window.projectMarkdowns object
function loadProjects() {
    projectsGrid.innerHTML = ''; // Clear loading message

    // Check if there are any projects
    if (projectSlugs.length === 0) {
        projectsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>Projects coming soon...</p>
            </div>
        `;
        return;
    }

    // Process each project
    for (const slug of projectSlugs) {
        if (window.projectMarkdowns && window.projectMarkdowns[slug]) {
            const markdown = window.projectMarkdowns[slug];

            // Parse markdown and frontmatter
            const parsed = parseFrontmatter(markdown);

            // Store the parsed data
            const projectData = {
                title: parsed.frontmatter.title || 'Untitled Project',
                description: parsed.content.split('\n\n').slice(0, 2).join('\n\n'),
                content: parsed.content,
                frontmatter: parsed.frontmatter,
                technologies: parsed.frontmatter.tags ? parsed.frontmatter.tags.slice(0, 5).join(', ') : '',
                category: parsed.frontmatter.tags ? parsed.frontmatter.tags.slice(0, 2).join(', ') : '',
                tags: parsed.frontmatter.tags || []
            };

            // Create and append the project card
            const projectCard = createProjectCard(projectData, slug);
            projectsGrid.appendChild(projectCard);
        }
    }

    // Add event listeners to view-project links
    document.querySelectorAll('.view-project').forEach(link => {
        link.addEventListener('click', handleProjectClick);
    });
}

// Handle click on project card
function handleProjectClick(e) {
    e.preventDefault();

    const slug = this.getAttribute('data-slug');
    if (!window.projectMarkdowns || !window.projectMarkdowns[slug]) return;

    const markdown = window.projectMarkdowns[slug];
    const parsed = parseFrontmatter(markdown);

    // Hide projects section
    projectsSection.style.display = 'none';

    // Get image from the markdown if available
    let imageUrl = 'https://placehold.co/800x600';
    if (parsed.frontmatter.featured_image && !parsed.frontmatter.featured_image.startsWith('#')) {
        imageUrl = parsed.frontmatter.featured_image;
    }

    // Create a short description from the first paragraph or Project Goals section
    let shortDescription = '';
    const firstParaMatch = parsed.content.match(/##\s*Project Goals\s*\n\n([^#]+)/);
    if (firstParaMatch) {
        shortDescription = firstParaMatch[1].trim();
    } else {
        // Fallback to first paragraph
        const firstPara = parsed.content.split('\n\n')[0];
        shortDescription = firstPara.replace(/^#.*\n/, '').trim();
    }

    // Populate project detail
    projectDetailContent.innerHTML = `
        <div class="project-detail-header">
            <img src="${imageUrl}" alt="${parsed.frontmatter.title}" class="project-detail-image">
            <div class="project-detail-info">
                <h2>${parsed.frontmatter.title}</h2>
                <p class="project-detail-description">${shortDescription}</p>

                <div class="project-detail-meta">
                    <div class="meta-item">
                        <span class="meta-title">Technologies</span>
                        <span class="meta-value">${parsed.frontmatter.tags ? parsed.frontmatter.tags.slice(0, 5).join(', ') : 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-title">Date</span>
                        <span class="meta-value">${parsed.frontmatter.date || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="project-detail-content">
            ${markdownToHtml(parsed.content)}
        </div>
    `;

    // Show project detail
    projectDetail.classList.remove('hidden');

    // Scroll to top
    window.scrollTo(0, 0);
}

// Handle filter buttons
filterButtons.forEach(button => {
    button.addEventListener('click', function() {
        // Remove active class from all buttons
        filterButtons.forEach(btn => btn.classList.remove('active'));

        // Add active class to clicked button
        this.classList.add('active');

        // Get filter value
        const filter = this.getAttribute('data-filter');

        // Filter projects
        const projectCards = document.querySelectorAll('.project-card');

        if (filter === 'all') {
            projectCards.forEach(card => {
                card.style.display = 'block';
            });
        } else {
            projectCards.forEach(card => {
                if (card.dataset.categories.includes(filter)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    });
});

// Back button
backButton.addEventListener('click', function() {
    // Hide project detail
    projectDetail.classList.add('hidden');

    // Show projects section
    projectsSection.style.display = 'block';

    // Scroll to top
    window.scrollTo(0, 0);
});

// Load projects when page loads
document.addEventListener('DOMContentLoaded', loadProjects);
