import gimp
from gimpfu import *
def find_layer_by_name(container, name):
    for layer in container.layers:
        if layer.name == name: return layer
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
            if has_lbl and has_img: groups.append(layer)
            else: groups.extend(find_city_groups(layer))
    return groups

def calculate_label_offsets():
    try:
        image = gimp.image_list()[0]
    except IndexError:
        print "No image open in GIMP."
        return
    cities_root = find_layer_by_name(image, "Cities")
    if not cities_root:
        print "Error: Group 'Cities' not found."
        return
    city_groups = find_city_groups(cities_root)
    print "\n--- START LABEL OFFSETS ---"
    for group in sorted(city_groups, key=lambda g: g.name):
        lbl = None
        img = None
        for sub in group.layers:
            if sub.name.startswith("lbl"): lbl = sub
            elif sub.name.startswith("img"): img = sub
        if lbl and img:
            ix, iy = img.offsets
            lx, ly = lbl.offsets
            print '"%s": [%d, %d],' % (group.name, lx - ix, ly - iy)
    print "--- END LABEL OFFSETS ---\n"

calculate_label_offsets()
