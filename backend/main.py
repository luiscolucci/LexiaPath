import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from pypdf import PdfReader # Nova importação para ler PDF
import io

# --- CONFIGURAÇÃO ---
# Lembre de trocar pela sua API KEY se não estiver usando variáveis de ambiente
# 1. Carrega as variáveis do arquivo .env
load_dotenv()

# 2. Pega a chave de lá de dentro
MY_API_KEY = os.getenv("GOOGLE_API_KEY")

# Verifica se a chave foi encontrada (Segurança)
if not MY_API_KEY:
    raise ValueError("ERRO: A variável GOOGLE_API_KEY não foi encontrada no arquivo .env")

genai.configure(api_key=MY_API_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_INSTRUCTION = """
ATUE COMO: Um Pedagogo Especialista em Neurodiversidade e Dislexia (Método Orton-Gillingham).
SEU OBJETIVO: Não apenas resumir, mas ENSINAR o conteúdo do texto fornecido, reduzindo a carga cognitiva.

SIGA ESTRITAMENTE ESTE FORMATO DE SAÍDA (MARKDOWN):

# 🧠 Preparação (Vocabulário)
(Identifique as 3 palavras ou termos mais complexos do texto original. Explique-os aqui de forma muito simples antes de começar a leitura, para remover barreiras).
* **[Termo 1]:** [Explicação simples]
* **[Termo 2]:** [Explicação simples]
* **[Termo 3]:** [Explicação simples]

---

# 📖 O Conteúdo Explicado
(Reescreva o texto original seguindo estas regras):
1.  **Use Analogias:** Sempre que possível, compare conceitos técnicos com coisas do dia a dia (ex: carros, cozinha, natureza).
2.  **Chunking (Blocos):** Nunca escreva parágrafos com mais de 3 linhas. Pule linhas frequentemente.
3.  **Destaques:** Use **negrito** apenas nas ideias centrais.
4.  **Marcadores:** Use listas (bullet points) para qualquer enumeração.
5.  **Tom de Voz:** Encorajador, paciente e claro.

---

# 🎨 Visualização Mental
(Descreva uma cena ou imagem que represente o conceito principal, ajudando o aluno a criar uma "âncora visual" na memória).
> *Imagine a seguinte cena: ...*

---

# 🚀 Desafio Rápido (Fixação)
(Crie uma única pergunta de múltipla escolha ou uma pergunta reflexiva simples para validar se o usuário entendeu o ponto principal. Dê a resposta correta logo abaixo de cabeça para baixo ou escondida com a tag de spoiler >!Resposta!<).
"""

class TextRequest(BaseModel):
    original_text: str

def simplify_with_gemini(text: str):
    """Função auxiliar para chamar o Gemini"""
    model = genai.GenerativeModel(
        model_name="models/gemini-2.5-pro",
        system_instruction=SYSTEM_INSTRUCTION
    )
    response = model.generate_content(text)
    return response.text

@app.post("/simplify")
async def simplify_text(request: TextRequest):
    try:
        simplified = simplify_with_gemini(request.original_text)
        return {"simplified_text": simplified}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        print(f"Recebendo arquivo: {file.filename}") # Log para debug

        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Apenas arquivos .pdf são permitidos")

        content = await file.read()
        pdf_reader = PdfReader(io.BytesIO(content))
        
        text = ""
        # LIMITADOR: Vamos ler apenas as primeiras 30 páginas para o MVP não travar
        # Se quiser ler tudo, remova a condição 'if i >= 30: break'
        max_pages = 30 
        
        print(f"Processando PDF com {len(pdf_reader.pages)} páginas...")

        for i, page in enumerate(pdf_reader.pages):
            if i >= max_pages: 
                break
                
            extracted = page.extract_text()
            
            # CORREÇÃO CRÍTICA: Verifica se extracted não é None antes de somar
            if extracted:
                text += extracted + "\n"
            else:
                print(f"Página {i+1} não continha texto extraível (provavelmente imagem).")

        if not text.strip():
            raise HTTPException(status_code=400, detail="Não foi possível extrair texto deste PDF. Ele pode ser um arquivo escaneado (imagem).")

        print("Enviando texto para o Gemini...")
        simplified = simplify_with_gemini(text)
        print("Sucesso! Retornando resposta.")
        
        return {"simplified_text": simplified}

    except Exception as e:
        print(f"ERRO CRÍTICO NO BACKEND: {e}") # Isso vai aparecer no seu terminal
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
