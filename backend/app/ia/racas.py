"""
Tabela das classes de cães e gatos do ImageNet usadas pelo classificador de fotos (RF23).

Cada classe do modelo (índice 0–999 do ImageNet) que é um cão ou um gato vira
(nome em português, porte). O porte é o porte típico da raça adulta.
Classes que não estão aqui (objetos, outros animais) não contam como cão nem gato.
"""

P, M, G = "pequeno", "medio", "grande"

CAES = {
    151: ("Chihuahua", P), 152: ("Spaniel japonês", P), 153: ("Maltês", P), 154: ("Pequinês", P),
    155: ("Shih-tzu", P), 156: ("Cavalier King Charles", P), 157: ("Papillon", P), 158: ("Toy terrier", P),
    159: ("Rhodesian ridgeback", G), 160: ("Galgo afegão", G), 161: ("Basset hound", M), 162: ("Beagle", M),
    163: ("Bloodhound", G), 164: ("Coonhound", G), 165: ("Coonhound", G), 166: ("Foxhound", G),
    167: ("Foxhound inglês", G), 168: ("Coonhound", G), 169: ("Borzoi", G), 170: ("Wolfhound irlandês", G),
    171: ("Galgo italiano", P), 172: ("Whippet", M), 173: ("Podengo ibicenco", G), 174: ("Elkhound norueguês", M),
    175: ("Otterhound", G), 176: ("Saluki", G), 177: ("Deerhound", G), 178: ("Weimaraner", G),
    179: ("Staffordshire bull terrier", M), 180: ("American Staffordshire", M), 181: ("Bedlington terrier", M),
    182: ("Border terrier", P), 183: ("Kerry blue terrier", M), 184: ("Terrier irlandês", M),
    185: ("Norfolk terrier", P), 186: ("Norwich terrier", P), 187: ("Yorkshire", P),
    188: ("Fox terrier", P), 189: ("Lakeland terrier", P), 190: ("Sealyham terrier", P), 191: ("Airedale", G),
    192: ("Cairn terrier", P), 193: ("Terrier australiano", P), 194: ("Dandie Dinmont", P),
    195: ("Boston terrier", P), 196: ("Schnauzer miniatura", P), 197: ("Schnauzer gigante", G),
    198: ("Schnauzer", M), 199: ("Scottish terrier", P), 200: ("Terrier tibetano", M), 201: ("Silky terrier", P),
    202: ("Wheaten terrier", M), 203: ("West Highland terrier", P), 204: ("Lhasa apso", P),
    205: ("Flat-coated retriever", G), 206: ("Curly-coated retriever", G), 207: ("Golden retriever", G),
    208: ("Labrador", G), 209: ("Chesapeake retriever", G), 210: ("Pointer alemão", G), 211: ("Vizsla", G),
    212: ("Setter inglês", G), 213: ("Setter irlandês", G), 214: ("Gordon setter", G), 215: ("Brittany", M),
    216: ("Clumber spaniel", M), 217: ("Springer spaniel", M), 218: ("Springer spaniel galês", M),
    219: ("Cocker spaniel", M), 220: ("Sussex spaniel", M), 221: ("Spaniel d'água irlandês", M),
    222: ("Kuvasz", G), 223: ("Schipperke", P), 224: ("Pastor belga", G), 225: ("Pastor belga malinois", G),
    226: ("Briard", G), 227: ("Kelpie", M), 228: ("Komondor", G), 229: ("Old English sheepdog", G),
    230: ("Pastor de Shetland", P), 231: ("Collie", G), 232: ("Border collie", M), 233: ("Bouvier", G),
    234: ("Rottweiler", G), 235: ("Pastor alemão", G), 236: ("Dobermann", G), 237: ("Pinscher", P),
    238: ("Boiadeiro suíço", G), 239: ("Boiadeiro bernês", G), 240: ("Appenzeller", M), 241: ("Entlebucher", M),
    242: ("Boxer", G), 243: ("Bullmastiff", G), 244: ("Mastim tibetano", G), 245: ("Buldogue francês", P),
    246: ("Dogue alemão", G), 247: ("São Bernardo", G), 248: ("Cão esquimó", G), 249: ("Malamute", G),
    250: ("Husky siberiano", G), 251: ("Dálmata", G), 252: ("Affenpinscher", P), 253: ("Basenji", M),
    254: ("Pug", P), 255: ("Leonberger", G), 256: ("Terra-nova", G), 257: ("Montanhês dos Pirineus", G),
    258: ("Samoieda", G), 259: ("Lulu da Pomerânia", P), 260: ("Chow-chow", M), 261: ("Keeshond", M),
    262: ("Griffon de Bruxelas", P), 263: ("Corgi", P), 264: ("Corgi Cardigan", P), 265: ("Poodle toy", P),
    266: ("Poodle miniatura", P), 267: ("Poodle", M), 268: ("Pelado mexicano", M),
}

GATOS = {
    281: "SRD (rajado)", 282: "SRD (tigrado)", 283: "Persa", 284: "Siamês", 285: "SRD (pelo curto)",
}
