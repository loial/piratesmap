import gimp
from gimpfu import *
CITY_ERAS = {
    "Antigua": [1640, 1660, 1680], "Barbados": [1620, 1640, 1660, 1680],
    "Belize": [1680], "Bermuda": [1640, 1660, 1680], "Borburata": [1560],
    "Campeche": [1560, 1600, 1620, 1640, 1660, 1680], "Caracas": [1600, 1620, 1640, 1660, 1680],
    "Cartagena": [1560, 1600, 1620, 1640, 1660, 1680], "Coro": [1560, 1600, 1620],
    "Cumaná": [1560, 1600, 1620, 1640, 1660, 1680], "Curaçao": [1620, 1640, 1660, 1680],
    "Eleuthera": [1560, 1600, 1620, 1640, 1660, 1680], "Florida Keys": [1560, 1620, 1640],
    "Gibraltar": [1560, 1600, 1620, 1640, 1660], "Gran Granada": [1560, 1600, 1620, 1640, 1660, 1680],
    "Grand Bahama": [1560, 1600, 1620], "Grenada": [1600], "Guadeloupe": [1640, 1660, 1680],
    "Havana": [1560, 1600, 1620, 1640, 1660, 1680], "Isabella": [1560], "La Vega": [1600, 1620, 1640],
    "Léogâne": [1660, 1680], "Maracaibo": [1560, 1600, 1620, 1640, 1660, 1680],
    "Margarita": [1560, 1600, 1620, 1640, 1660, 1680], "Martinique": [1640, 1660, 1680],
    "Montserrat": [1640, 1660, 1680], "Nassau": [1560, 1680], "Nevis": [1620, 1640, 1660, 1680],
    "Nombre de Dios": [1560], "Panama": [1560, 1600, 1620, 1640, 1660, 1680],
    "Petit-Goâve": [1620, 1640, 1660, 1680], "Port-de-Paix": [1660, 1680],
    "Port Royale": [1660, 1680], "Puerto Bello": [1600, 1620, 1640, 1660, 1680],
    "Puerto Cabello": [1560, 1600, 1620], "Puerto Príncipe": [1560, 1600, 1620, 1640, 1660, 1680],
    "Providence": [1620], "Rio de la Hacha": [1560, 1600, 1620, 1640, 1660, 1680],
    "San Juan": [1560, 1600, 1620, 1640, 1660, 1680], "Santa Catalina": [1640, 1660],
    "Santo Domingo": [1560, 1600, 1620, 1640, 1660, 1680], "Santa Marta": [1560, 1600, 1620, 1640, 1660, 1680],
    "Santiago": [1560, 1600, 1620, 1640, 1660, 1680], "Santiago de la Vega": [1560, 1600, 1620, 1640],
    "St. Augustine": [1560, 1600, 1620, 1640, 1660, 1680], "St. Christophe": [1620],
    "St. Eustatius": [1640, 1660, 1680], "St. Kitts": [1640, 1660, 1680], "St. Lucia": [1600],
    "St. Martin": [1640, 1660, 1680], "St. Thomé": [1600, 1620], "Tortuga": [1620, 1640, 1660, 1680],
    "Trinidad": [1560, 1600, 1620, 1640, 1660, 1680], "Vera Cruz": [1560, 1600, 1620, 1640, 1660, 1680],
    "Villa Hermosa": [1560, 1600, 1620, 1640, 1660, 1680], "Yaguana": [1560]
}

def find_layer_by_name(container, name):
    for layer in container.layers:
        if layer.name == name:
            return layer
        if hasattr(layer, 'layers'):
            found = find_layer_by_name(layer, name)
            if found: return found
    return None

def find_city_groups(container):
    groups = []
    for layer in container.layers:
        if hasattr(layer, 'layers'):
            sub_names = [l.name for l in layer.layers]
            has_lbl = any(n.startswith("lbl") for n in sub_names)
            has_img = any(n.startswith("img") for n in sub_names)
            if has_lbl and has_img:
                groups.append(layer)
            else:
                groups.extend(find_city_groups(layer))
    return groups

def setup_map_variant(era, show_base=True, show_labels=True):
    try:
        image = gimp.image_list()[0]
    except IndexError:
        print "No image open in GIMP."
        return
    active_layer = pdb.gimp_image_get_active_layer(image)
    base_layer = find_layer_by_name(image, "Base")
    if base_layer: base_layer.visible = show_base
    else: print "Warning: Layer 'Base' not found."
    cities_root = find_layer_by_name(image, "Cities")
    if not cities_root:
        print "Error: Group 'Cities' not found."
        return
    city_groups = find_city_groups(cities_root)
    for group in city_groups:
        city_name = group.name
        should_be_visible = False
        if era == "full": should_be_visible = True
        elif city_name in CITY_ERAS:
            if era in CITY_ERAS[city_name]: should_be_visible = True
        group.visible = should_be_visible
        if should_be_visible:
            for sub in group.layers:
                if sub.name.startswith("lbl"): sub.visible = show_labels
                elif sub.name.startswith("img"): sub.visible = True
    if active_layer: pdb.gimp_image_set_active_layer(image, active_layer)
    gimp.displays_flush()
    print "Updated: Era %s | Base %s | Labels %s" % (era, show_base, show_labels)

print "--- Map Automation Loaded ---"
print "Usage: setup_map_variant(1660, show_base=True, show_labels=True)"
print "Eras: 1560, 1600, 1620, 1640, 1660, 1680, 'full'"

def export_all_variants(outputfolder, prefix="PiratesMap", label_postfix="Retro"):
    if not outputfolder:
        print "Name of output folder is required"
    try:
        image = gimp.image_list()[0]
    except IndexError:
        print "No image open in GIMP."
        return
    eras=[1560,1600,1620,1640,1660,1680,"full"]
    active_layer=pdb.gimp_image_get_active_layer(image)
    top_layer = image.layers[0]
    # cities_root = find_layer_by_name(image, "Cities")
    base_layer = find_layer_by_name(image, "Base")
    base_layer.visible=True
    filename=prefix+"Base"+".png"
    pdb.file_png_save_defaults(image, base_layer, outputfolder+"/"+filename, filename)
    # cities_root.visible=True
    for era in eras:
        for base in [False,True]:
            for label in [False,True]:
                setup_map_variant(era,show_base=base,show_labels=label)
                filename=prefix
                if not base:
                    filename=filename+"Overlay"                
                filename=filename+str(era).capitalize()
                if label:
                    filename=filename+label_postfix
                else:
                    filename=filename+"NoLabel"
                filename=filename+".png"
                pdb.file_png_save_defaults(image, top_layer, outputfolder+"/"+filename, filename)
    if active_layer: pdb.gimp_image_set_active_layer(image, active_layer)
    gimp.displays_flush()

export_all_variants("output")

