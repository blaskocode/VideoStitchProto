flowchart TD

%% Entry
A[User Enters Web App] --> B[Inspire Me Chatbot]

%% Inspire Me Phase
B --> B1[Prompt: "What are you trying to create?"]
B1 --> B2[Prompt: "What mood should the video convey?"]
B2 --> B3[Generate 6-10 Moodboards via LLM]
B3 --> B4[User Selects Moodboard]

%% Storyline Phase
B4 --> C[Generate 3 Text-Only Storylines]
C --> C1[User Selects Storyline]
C1 --> C2[LLM Expands into 3-5 Scene Tiles]

%% Scene Approval Phase
C2 --> D[User Approves Full Scene Flow]

%% Image Generation Phase
D --> E[Generate 1 Cinematic Realism Image per Scene]

%% Video Generation Phase
E --> F[Video Generation Jobs (Replicate)]
F --> F1[Clip 1]
F --> F2[Clip 2]
F --> F3[Clip 3]
F1 --> G[Store Clips in Supabase]
F2 --> G
F3 --> G

%% Audio Selection
G --> H[User Chooses Music (3 AI-generated options)]

%% Stitching and Final Output
H --> I[FFmpeg Worker: Stitch Clips + Add Transitions + Add Music]
I --> J[Render Final Video]

%% Completion
J --> K[User Downloads/Previews Final Video]
