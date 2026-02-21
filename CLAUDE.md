# English Word A Day Full Stack App

## Description
A English Word A Day Full Stack App designed for IT professionals to learn new words every day. The difference is how these English words integrates well with your day to day work including Cloud, Software Development, Design, Debugging, Testing, Security, AI, Machine Learning, Data Science, DevOps, appreciating other team members, sharing opinion professionally, Project Management, JIRA comments, JIRA User Story, JIRA User Story Task, Git Commit comments. 

The APP needs to be Engagement with lot of audience involvement and dive into more details.

Also how professionally express annonying or fuming or irritated or frustrated or such feelings in a professional manner.

The App should have a modern UI and should be responsive. Search by date or generes mentioned above. 

The APP should have a feature for users to recommend alternative words for the words mentioned above.

The APP should integrate with AWS Bedrock or Hugging Face or OpenAI or any other NLP API to get the meaning of the words and provide a better user experience.

The APP should have a feature for users to rate the words based on their difficulty level.

The APP should have a feature for users to provide 30 words excluding spaces sentence and provide alternative words for the words mentioned above. This is to help users to learn new words and improve their vocabulary.

The APP should have SignUp using their Google Account or GitHub Account.

This APP shoudl not store any user data in the database even the login credentails. It clearly states that the APP is not storing any user data in the database. But the APP should ensure the Google Account or GitHub Account is logged in successfully before using the APP. Dont know how we can do this but no user database but needs a login using Google Account or GitHub Account.

I dont like dark black background and also every genere home page should have similar structure like home page current layout. Also including home page and other genres home pages while we show a word to make user learn more words should have a lik to Next word.  and every genere home page should have good image. Also "Rate Difficulty" if the user is not logged in where we are going to store this user preference value ? "Rate Difficulty".

Dont reuse the images in the generes home pages.
Also when user clicks on Next Word dont reuse the same word for next 25 words. After 25 words it is ok to shuffle the words again. 
Also when user clicks on the Next Word dont change the page instead in the same section refresh the word for better user experience.

## Deployment
Thie APP is deployed in GitHub Pages.
The APP is deployed thorugh GitHub Actions invoked manually.
The APP is published as Docker image in DockerHub
All the secrets are stored in GitHub Actions secrets.

## Build Principles
- Small, modular systems in the backend as well as in the frontend and also in ML Models, AI models, AWS services usage
- Independent modules in the backend as well as in the frontend and also in ML Models, AI models, AWS services usage i.e. Independent by Design
- Privacy-first defaults
- No artificial urgency I mean no marketing or sales pitches in any of the content
- No engagement traps like hiding users tracking

BUILD DELIBERATELY FOR THE LONG TERM & EXPEND WITH CARE

Since we will have so many English words say 1 million words we need ot have pagination and caching in memmory for the words in the GO backend. If we deploy in AWS and use REDIS for caching property is enabled then we need to use that.

Ensure no page is broken when we deploy in AWS or GitHub Pages. Use a property to check if the APP is deployed in AWS or GitHub Pages and use the appropriate services.

To manage millions of words we need to have a strategy of folders based on generes and YYYY-MM-DD as the folder and in that folder we will have generes as sub-folders and in that folder we will have the words json files sequence numnbered and each row in the JSON should have date and genre and word and meaning and example sentence and synonyms and antonyms and related words and user provided text surrounding a word and recommendations.

- Ensure backend GO project is modularized based on domain services, customer_profile api, words_service api, search_service api, user_content_service for user provided sentences, billing_service api, subscription_service api, payment_service api, integrations_service api and more 

## Tech Stack

- Next.js
- React
- Tailwind CSS
- AWS Bedrock
- GitHub Pages
- GO language for the backend
- File based database to reduce the deployment cost in GitHub pages
- GitHub Actions for CI/CD
- Docker for containerization
- GitHub Actions secrets for storing secrets
- DockerHub for publishing the Docker image
- When deployed in AWS (APP knows through a property) then only it users    AWS native services for the backend and for deployment
- A separate property is added to the APP to know if it is deployed in AWS or GitHub Pages with GitHub Pages as default deployment if no such property is configured
- Use AWS BedRock, AWS OpenSearch Vector Database, AWS S3 for static files, AWS Lambda for API for updating the new or existing English words, also use AWS Lambda API for user provided text surrodning a word and providing 20 recommendations in the UI. Storing the user session in AWS database.
- AWS Bedrock based AI agent that looks for users who are not active from last 1 hr then it will send summary of the user activity from the last summary email sent. If there is any issues in running this agent for more than a day then consider last activity of the user as starting of the day. But if for an user if an activity exists in the same day then it will consider the last activity as starting of the day for the user.
- This project should suppor tusing various ML models for generating the recommendations for the words. We dont show the model name in the UI. We just show the recommendations. We should new flashing feature(s) everytimt we integrate with a modle in the backend. 
- Use messaging queue AWS technologies all possible to send email notifications to the user
- Use AWS Cognito for user management
- Use AWS Config, AWS Service Catalog, AWS Route53, AWS API Gateway, AWS CloudFront, AWS S3, AWS Lambda, AWS Bedrock, AWS OpenSearch Vector Database, AWS S3 for static files, AWS Lambda for API for updating the new or existing English words, also use AWS Lambda API for user provided text surrodning a word and providing 20 recommendations in the UI. Storing the user session in AWS database. All these AWS Services are used only when the APP is deployed in AWS.

## UI Features

Dont clutter the dashboard page and every page with too many options and too many English words.

Dont use black color background color for the UI.  Use appealing colors for professional user sin the UI

- Responsive UI
- Modern UI
- Search by date
- Search by category
- Search by word
- Search by meaning
- Search by difficulty level
- Search by alternative words
- Search by sentence
- Left Nav Bar for top 10 Generes
- Dashboard lists top 10 Generes and for each Genere it lists top 10 words with sample phrase

## This codebase Git Repo Structure 
1. Portals/EnglishWordADayPortal
2. Services/EnglishWordADayService - purely GO based with API

## Running the Application Locally.
1. Create package.json at the root of the repo and this package.json is different from the package.json in the Portals/EnglishWordADayPortal and Services/EnglishWordADayService
2. The root package.json will have commands to start the application locally.
3. The root package.json will have commands to build the application locally.
4. The root package.json will have commands to deploy the application locally.
5. The root package.json will have commands to run the tests locally.
6. The root package.json will have commands to run the linter locally.
7. The root package.json will have commands to run the formatter locally.
8. The root package.json will have commands to run the formatter locally.
9. The root package.json will have commands to run the formatter locally.
10. The root package.json will have commands to run the formatter locally.
11. The root package.json will have commands to run the formatter locally.
12. The root package.json will have commands to run the formatter locally.
13. The root package.json will have commands to run the formatter locally.
14. The root package.json will have commands to run the formatter locally.
15. The root package.json will have commands to run the formatter locally.
16. The root package.json will have commands to run the formatter locally.
17. The root package.json will have commands to run the formatter locally.
18. The root package.json will have commands to run the formatter locally.
19. The root package.json will have commands to run the formatter locally.
20. The root package.json will have commands to run the formatter locally.
21. The root package.json will have commands to run the formatter locally.
