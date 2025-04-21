import sys
import json
import spacy
import pdfplumber
import requests
import tempfile
import os
from docx import Document
from rapidfuzz import fuzz

# Load spacy model once
nlp = spacy.load("en_core_web_sm")

def download_file(url):
    """Download file from URL to a temporary file and return the path"""
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        # Get file extension from URL
        file_extension = os.path.splitext(url)[1].lower()
        if not file_extension:
            # Default to PDF if no extension found
            file_extension = '.pdf'
            
        # Create a temporary file with the correct extension
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        temp_file_path = temp_file.name
        
        # Write content to the temporary file
        with open(temp_file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                
        return temp_file_path
    except Exception as e:
        raise Exception(f"Failed to download file: {str(e)}")

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.lower()

def extract_text_from_docx(docx_path):
    doc = Document(docx_path)
    full_text = [para.text for para in doc.paragraphs]
    return "\n".join(full_text).lower()

def extract_skills_from_resume(resume_text, user_skills, threshold=85):
    resume_text = resume_text.lower()
    doc = nlp(resume_text)
    tokens = [token.text for token in doc if not token.is_stop and not token.is_punct]
    found_skills = set()

    for skill in user_skills:
        skill_clean = skill.lower().strip()
        if (all(word in tokens for word in skill_clean.split())) or (skill_clean in resume_text):
            found_skills.add(skill.strip())
        else:
            if fuzz.partial_ratio(skill_clean, resume_text) >= threshold:
                found_skills.add(skill.strip())

    return list(found_skills)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)

    resume_path = sys.argv[1]
    skills = sys.argv[2].split(',')
    
    try:
        # Check if resume_path is a URL (starts with http or https)
        if resume_path.startswith(('http://', 'https://')):
            # Download the file from URL
            temp_file_path = download_file(resume_path)
            resume_path = temp_file_path
        
        if resume_path.lower().endswith(".pdf"):
            resume_text = extract_text_from_pdf(resume_path)
        elif resume_path.lower().endswith(".docx"):
            resume_text = extract_text_from_docx(resume_path)
        else:
            print(json.dumps({"error": "Unsupported file type"}))
            sys.exit(1)

        matched_skills = extract_skills_from_resume(resume_text, skills)
        total_skills = len(skills)
        found = len(matched_skills)
        percentage = (found / total_skills) * 100 if total_skills > 0 else 0

        result = {
            "matched_skills": matched_skills,
            "missing_skills": list(set(skills) - set(matched_skills)),
            "matchPercentage": round(percentage, 2)
        }
        
        print(json.dumps(result))
        
        # Clean up temporary file if it was created
        if resume_path.startswith(tempfile.gettempdir()):
            try:
                os.unlink(resume_path)
            except:
                pass
                
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)