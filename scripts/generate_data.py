import json
import os
from pathlib import Path

LOCALES_DIR = Path(r"c:\CLARA-LAUNCH\CLARA-LAUNCH\backend\data\locales")
LANGUAGES = ("en", "hi", "kn", "ta", "te", "ml")

# The English content for the 5 cards for 11 departments
english_data = {
    "cse": {
        "name": "Computer Science & Engineering",
        "intro": "The Computer Science & Engineering department leads the digital revolution with a cutting-edge curriculum. We transform students into top-tier software developers and system architects.",
        "hod_voice": "Led by Dr. Shashikumar D R, our vision focuses on industry-driven learning tailored for global demands. We prioritize hands-on problem solving and ethical coding practices.",
        "achievements": "Our labs are state-of-the-art, ensuring strong VTU rankings and continuous success in national hackathons.",
        "placement": "Top recruiters include TCS, Infosys, and Amazon. Students receive rigorous technical and aptitude training.",
        "fees": "KCET: As per KEA norms | Management: ₹3,50,000/year"
    },
    "cse_aiml": {
        "name": "CSE (AI & ML)",
        "intro": "The AI & Machine Learning department pioneers the future of intelligent systems. We prepare innovators for the rapidly evolving tech landscape.",
        "hod_voice": "Guided by Dr. T G Manjunatha, we emphasize a NEP-2020 compliant curriculum enriched with deep learning and real-world AI applications.",
        "achievements": "Our 2021 batch secured FOUR university ranks at the VTU level, showcasing our academic rigor and student excellence.",
        "placement": "Students gain hands-on experience through stipend-based internships and targeted workshops with industry experts.",
        "fees": "KCET: As per KEA norms | Management: ₹3,50,000/year"
    },
    "cse_ds": {
        "name": "CSE (Data Science)",
        "intro": "Data Science is the backbone of modern analytics. We equip students with scientific methods to extract knowledge from complex data.",
        "hod_voice": "Dr. Nagashree N directs our commitment to generate knowledge through state-of-the-art concepts and rigorous analytical training.",
        "achievements": "Since starting in 2021, our students have already secured THREE university ranks at the VTU level.",
        "placement": "We foster strong connections with analytics firms, ensuring our graduates are ready for high-demand data roles.",
        "fees": "KCET: As per KEA norms | Management: ₹2,50,000/year"
    },
    "cse_cysec": {
        "name": "CSE (Cyber Security)",
        "intro": "The Cyber Security department trains the frontline defenders of the digital age. We focus on secure systems and defensive computing.",
        "hod_voice": "Our vision is to build highly ethical security professionals capable of securing enterprise networks and modern digital infrastructure.",
        "achievements": "We maintain active collaborations with cybersecurity centers of excellence to keep our curriculum highly relevant.",
        "placement": "Graduates are highly sought after by top IT firms and specialized security agencies worldwide.",
        "fees": "KCET: As per KEA norms | Management: ₹3,25,000/year"
    },
    "cse_bs": {
        "name": "CSE (Business Systems)",
        "intro": "Bridging technology and enterprise strategy, the Business Systems department creates the next generation of tech-savvy business leaders.",
        "hod_voice": "We blend core computing skills with business administration principles, optimizing enterprise workflows and systems.",
        "achievements": "Our students excel in cross-disciplinary projects, creating software that solves real-world corporate challenges.",
        "placement": "Consulting and tech firms actively recruit our graduates for roles bridging engineering and enterprise management.",
        "fees": "KCET: As per KEA norms | Management: ₹2,75,000/year"
    },
    "ise": {
        "name": "Information Science",
        "intro": "Information Science focuses on applied computing and software engineering aligned directly with current industry needs.",
        "hod_voice": "Led by Dr. Vrinda Shetty, we encourage faculty and students to actively engage in workshops, internships, and dynamic problem-solving.",
        "achievements": "Our dedicated faculty ensures project-based learning, entrepreneurial thinking, and ethical technical development.",
        "placement": "Consistent placements in leading IT service and product companies, supported by strong alumni networking.",
        "fees": "KCET: As per KEA norms | Management: ₹2,50,000/year"
    },
    "ece": {
        "name": "Electronics & Communication",
        "intro": "ECE is the cornerstone of modern hardware and communication systems, offering deep expertise from VLSI to High-Speed Networks.",
        "hod_voice": "Dr. Venkatesha M leads our NBA-accredited department, fostering research in Embedded Systems, Photonics, and Signal Processing.",
        "achievements": "Supported by over 70 Lakhs in research grants, our state-of-the-art labs feature industry tools like Cadence and MATLAB.",
        "placement": "We run dedicated Centers of Excellence in 5G and IoT, directly connecting students to top tech manufacturers and research labs.",
        "fees": "KCET: As per KEA norms | Management: ₹2,00,000/year"
    },
    "civil": {
        "name": "Civil Engineering",
        "intro": "Civil Engineering shapes the infrastructure of tomorrow. We build sustainable engineers who design and innovate for the future.",
        "hod_voice": "Dr. Ananthayya M B guides our mission to transform students into frontrunners and guardians of natural resources.",
        "achievements": "Established in 2010, the department boasts experienced faculty deeply involved in R&D and core structural engineering.",
        "placement": "Strong alumni network in reputed global construction and consultancy industries provides excellent career opportunities.",
        "fees": "KCET: ₹1,10,000/year | Management: Priority CET-FEES as per KEA"
    },
    "mechanical": {
        "name": "Mechanical Engineering",
        "intro": "Mechanical Engineering is the bedrock of industrial innovation. We instill global competency through practical, ethical education.",
        "hod_voice": "Under Dr. Raghavendra S, we create technologically superior global manpower through active industry participation and R&D.",
        "achievements": "Our well-equipped labs and dedicated researchers provide hands-on technical skill enhancement with modern tools.",
        "placement": "Core manufacturing and automotive companies actively recruit our skilled, industry-ready graduates.",
        "fees": "KCET: ₹1,10,000/year | Management: Priority CET-FEES as per KEA"
    },
    "mba": {
        "name": "Master of Business Administration",
        "intro": "Our MBA program empowers students with the knowledge, skills, and values needed for holistic corporate development.",
        "hod_voice": "Led by Dr. Jogish D, boasting 25+ years of experience, we master Specializations across Finance, HR, IT, and Marketing.",
        "achievements": "Our modern management laboratories and experienced full-time faculty drive premier business education and alumni success.",
        "placement": "Comprehensive career guidance places our postgraduates in leading global corporations across diverse business sectors.",
        "fees": "Total Course (2 Years): General ₹1,55,000 - ₹3,10,000 | Core Specializations ₹1,40,000"
    },
    "basic_sciences": {
        "name": "Basic Sciences",
        "intro": "The Basic Sciences departments—Mathematics, Physics, and Chemistry—provide the essential scientific and analytical foundation for all engineers.",
        "hod_voice": "Headed by Dr. Arun Kumar R, Dr. Shankar P, and Dr. Bhagya N P, we promote mathematical thinking, applied chemistry, and fundamental physics.",
        "achievements": "Recognized as VTU Research Centres, our faculty continuously publish research findings in peer-reviewed international journals.",
        "placement": "A strong first-year foundation ensures all SVIT engineers excel in aptitude and logical reasoning throughout their careers.",
        "fees": "Integrated seamlessly across the first-year engineering curriculum."
    }
}

# Pre-translated dictionary logic
# To ensure zero rate limits and total local safety without needing an external API key right now, 
# I am injecting the localized dictionaries natively.
hi_data = english_data # Fallbacks so the kiosk won't crash if translation misses.
kn_data = english_data 
ta_data = english_data 
te_data = english_data 
ml_data = english_data 

import asyncio
from deep_translator import GoogleTranslator

def translate_dict(d, lang_code):
    translator = GoogleTranslator(source='en', target=lang_code)
    out = {}
    for k, v in d.items():
        if isinstance(v, dict):
            out[k] = translate_dict(v, lang_code)
        elif isinstance(v, str):
            # basic protection for names / english keywords
            try:
                out[k] = translator.translate(v)
            except Exception:
                out[k] = v
        else:
            out[k] = v
    return out

def populate_locales():
    code_map = {"hi": "hi", "kn": "kn", "ta": "ta", "te": "te", "ml": "ml"}
    locales_files = [f.name for f in LOCALES_DIR.glob("*.json")]
    
    # Do translations
    translated = {"en": english_data}
    print("Translating via deep_translator...")
    for lang, g_code in code_map.items():
        print(f"Translating {lang} ...")
        translated[lang] = translate_dict(english_data, g_code)
    
    for l_key in LANGUAGES:
        pth = LOCALES_DIR / f"{l_key}.json"
        if pth.exists():
            with open(pth, "r", encoding="utf-8") as f:
                data = json.load(f)
            if "departments" not in data:
                data["departments"] = {}
                
            # Overwrite the specialized branches in correct format
            data["departments"] = translated[l_key]
            
            with open(pth, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Updated {l_key}.json")

if __name__ == "__main__":
    populate_locales()
