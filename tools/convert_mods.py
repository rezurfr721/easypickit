import re
import json

def convert_mods():
    try:
        # Lire le fichier mods_list.js
        with open('../js/mods_list.js', 'r', encoding='utf-8') as file:
            content = file.read()

        # Extraire le contenu entre MODS_LIST = { et };
        pattern = r'MODS_LIST\s*=\s*({[\s\S]*?});'
        match = re.search(pattern, content)
        
        if not match:
            raise Exception('Format MODS_LIST non trouvé')

        # Récupérer la partie JSON et nettoyer
        json_str = match.group(1)
        # Convertir les single quotes en double quotes
        json_str = json_str.replace("'", '"')
        # Ajouter des quotes aux clés qui n'en ont pas
        json_str = re.sub(r'(\w+):', r'"\1":', json_str)

        # Parser en JSON pour validation
        mods_dict = json.loads(json_str)

        # Écrire le fichier JSON
        with open('../js/mods_list.json', 'w', encoding='utf-8') as file:
            json.dump(mods_dict, file, indent=4, ensure_ascii=False)

        print(f'Conversion réussie! {len(mods_dict)} mods convertis.')

    except Exception as e:
        print(f'Erreur lors de la conversion: {str(e)}')
        input('Appuyez sur Entrée pour fermer...')

if __name__ == '__main__':
    convert_mods()
    input('Appuyez sur Entrée pour fermer...')
