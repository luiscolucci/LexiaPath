import google.generativeai as genai

# Cole sua chave aqui
genai.configure(api_key="AIzaSyAnpi3KYGvHy48hxgnprZqwnYc-EsAuZTQ")

print("Listando modelos disponíveis...")
for m in genai.list_models():
  if 'generateContent' in m.supported_generation_methods:
    print(m.name)
