# ReelMyGame session prompts: one job per session

Use one Claude session per job instead of one long chat, so the context doesn't fill up before the work is done.

## How to use
1. In the Claude app, open the Code tab and click **New session** with the folder `D:\Hypecut`.
2. Paste the prompt for the job you want.
3. When a session gets long, or Claude says the context is filling up, send the **End of session** prompt below. Then start a new session with the same prompt.
4. Keep each session to its own job. If something about another area comes up, note it and handle it in that area's session.

---

## 1. Shorts and YouTube
```
Job: ReelMyGame Shorts and YouTube only.
Read HANDOFF.md (sections 1 and 2 plus the marketing section) and the memory files project-marketing, project-shorts-performance, feedback-no-roblox-honest-claims.
Also read marketing/rmg-shorts-schedule.md and work/rmg-upload/HOWTO.md.
First, tell me in 5 lines how the Shorts are doing (views per channel), and what is scheduled and still to upload.
Then continue: make or upload the next Shorts. Ask me for a "yes" before posting anything.
Stay on Shorts and YouTube only.
```

## 2. Payments and Gumroad
```
Job: ReelMyGame payments only (Gumroad, Paddle appeal, plans and prices).
Read HANDOFF.md (sections 1, 4 and 5) and the memory files project-payments-status and feedback-pricing-and-topup.
First, tell me in 5 lines where payments stand, and what's left that only I can do.
Then help me test a real Gumroad purchase end to end, and fix anything that breaks.
Don't change prices and don't remove auto top-up. Don't commit unless I ask.
```

## 3. Website and Google search
```
Job: the ReelMyGame website (reelmygame.pages.dev) and getting it found on Google/Bing only.
Read HANDOFF.md (sections 1 to 4) and the memory files reference-search-console, project-live-deploy, feedback-no-roblox-honest-claims.
First, check the live site loads (/, /try, /terms, /privacy) and tell me what Search Console shows.
Then suggest the 3 changes most likely to bring visitors, and do them after I say yes.
Deploy only with the .deploy flow in HANDOFF section 4. Don't commit unless I ask.
```

## 4. ReelMyGame email check (quick, any time)
```
Job: a quick check, nothing else.
Read HANDOFF.md section 1.
Check my Gmail (the account signed in to Chrome) for anything new about ReelMyGame: Gumroad (sales), Paddle (appeal), Cloudflare, Google Search Console and YouTube.
Give me a short list of what needs my action. Don't reply to or send any emails.
```

---

## End of session (paste this before closing a long session)
```
Before we stop: update HANDOFF.md with what you did this session and what's left for this job, and update any memory files that changed. Keep it short. Don't commit unless I ask.
```
