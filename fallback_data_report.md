# Fallback Data Report

This document details the fallback mechanisms and data used when RAG or LLM generation fails.

## Fallback Messages
- **FALLBACK_MSG**: I'm sorry, I couldn't process your request right now.
- **CONTROLLED_FALLBACK_EN**: I'm sorry, I don't have that information right now.

## JSON Master Context (RAG Fallback)
When RAG returns 0 results or vector similarity is too low, the system falls back to the full structured JSON from en.json.

`json
{
  "institution_overview": {
    "about": "Sai Vidya Institute of Technology (SVIT) [cite: 8] Rajanukunte, Via Yalahanka, Bengaluru, Karnataka 560 064 [cite: 9] Established: 2008 [cite: 10] Campus: 12 acres [cite: 12] Students: 1,511+ [cite: 13] Faculty: 94+ [cite: 14]",
    "vision_and_mission": "\"Contribute dedicated, skilled, and intelligent engineers and business administrators to architect a strong India and a globally progressive world.\" [cite: 86] 1. Provide quality education and skill-based training to produce dedicated engineers and managers [cite: 88] 2. Promote research, innovation, and ethical practices by creating a supportive learning environment [cite: 89] 3. Undertake collaborative projects with academia and industry that transform young minds into socially responsible and globally competent professionals [cite: 90] 4. Enhance personality traits and leadership skills that foster entrepreneurship among students [cite: 91]",
    "affiliations_and_accreditations": "{'un
... (truncated for length)
`
