const { Octokit } = require("@octokit/rest");
const { context } = require("@actions/github");

async function run() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: token });

    const commentBody = context.payload.comment.body;
    const discussion = context.payload.discussion;
    const category = discussion.category.name;
    const user = context.payload.comment.user.login; 

    if (!commentBody.includes("~announce") || category !== "Announcements") {
      console.log("Comment does not contain ~announce or is not in Announcements category.");
      return;
    }

    const { data: collaborators } = await octokit.repos.listCollaborators({
      owner: context.repo.owner,
      repo: context.repo.repo,
    });

    const isAdmin = collaborators.some(
      (collaborator) => collaborator.login === user && collaborator.permissions.admin
    );

    if (!isAdmin) {
      console.log(`${user} is not an admin. Action aborted.`);
      return;
    }

    const repoOwner = context.repo.owner;
    const repoName = context.repo.repo;

    const discussionTitle = discussion.title;
    const discussionBody = discussion.body;

    // Create markdown content
    const markdownContent = `# ${discussionTitle}\n\n${discussionBody}`;
    const fileName = `announcements/current_announcement.md`;  

    const { data: file } = await octokit.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: fileName,
      ref: "main",
    }).catch(() => ({ data: null }));

    const fileExists = file && file.sha;

    await octokit.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: repoName,
      path: fileName,
      message: `Update current announcement: ${discussionTitle}`,
      content: Buffer.from(markdownContent).toString("base64"),
      sha: fileExists ? file.sha : undefined,
      committer: {
        name: "WKAnnouncementBot",
        email: "bot@watermelonkatana.com",
      },
      author: {
        name: "WKAnnouncementBot",
        email: "bot@watermelonkatana.com",
      },
    });

    console.log(`Markdown file ${fileName} created/updated successfully.`);
  } catch (error) {
    console.error("An error occurred:", error.message);
    process.exit(1);
  }
}

run();
