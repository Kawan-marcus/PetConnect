# Gera docs/diagramas/casos_de_uso.png (python docs/diagramas/casos_de_uso.py, precisa do Pillow).
#
# Organização para nenhuma linha cruzar outra elipse:
#   - coluna da esquerda: casos do visitante e do adotante;
#   - coluna da direita: casos da ONG (em cima), o caso comum ONG + administrador (UC13) e os do administrador;
#   - "Entrar / recuperar senha" (UC02) fica embaixo, ligado ao ator genérico "Usuário cadastrado",
#     do qual Adotante, ONG e Administrador herdam (seta de generalização).
import os

from PIL import Image, ImageDraw, ImageFont

W, H, S = 1900, 1560, 2
im = Image.new('RGB', (W * S, H * S), 'white')
d = ImageDraw.Draw(im)
AZUL, CINZA, TEXTO = '#1d3557', '#8a8a8a', '#222'


def fonte(t, negrito=False):
    nome = 'DejaVuSans-Bold.ttf' if negrito else 'DejaVuSans.ttf'
    return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/' + nome, t * S)


def P(*xy):
    return [v * S for v in xy]


d.text(P(W // 2, 34), 'PetConnect — Diagrama de casos de uso (versão 1.0.0)', font=fonte(26, True), fill=AZUL, anchor='mm')
d.rounded_rectangle(P(380, 80, 1520, 1300), radius=18 * S, outline=AZUL, width=3 * S, fill='#f7f9fc')
d.text(P(950, 108), 'Sistema PetConnect', font=fonte(20, True), fill=AZUL, anchor='mm')

LARG, ALT = 430, 84
pos = {}


def elipse(texto, cx, cy):
    pos[texto.split(' ')[0]] = (cx, cy)
    return texto, cx, cy


esquerda = ['UC01 Criar conta', 'UC03 Consultar catálogo', 'UC04 Preencher formulário de avaliação',
            'UC05 Ver recomendações e compatibilidade', 'UC06 Solicitar adoção', 'UC07 Acompanhar e cancelar pedido']
direita = ['UC08 Cadastrar animal com sugestão pela foto', 'UC09 Analisar e decidir pedido',
           'UC10 Concluir adoção e pós-adoção', 'UC13 Dashboard, relatórios e exportação', 'UC11 Aprovar ONG',
           'UC12 Gerenciar usuários e animais', 'UC14 Pesquisar e auditar operações', 'UC15 Medir desempenho (OpenCL)']
fila = [elipse(t, 650, 175 + i * 150) for i, t in enumerate(esquerda)]
fila += [elipse(t, 1250, 175 + i * 128) for i, t in enumerate(direita)]
fila.append(elipse('UC02 Entrar / recuperar senha', 950, 1210))


def ator(nome, x, y):
    c = '#333'
    d.ellipse(P(x - 20, y - 70, x + 20, y - 30), outline=c, width=3 * S)
    d.line(P(x, y - 30, x, y + 25), fill=c, width=3 * S)
    d.line(P(x - 32, y - 10, x + 32, y - 10), fill=c, width=3 * S)
    d.line(P(x, y + 25, x - 25, y + 65), fill=c, width=3 * S)
    d.line(P(x, y + 25, x + 25, y + 65), fill=c, width=3 * S)
    d.text(P(x, y + 90), nome, font=fonte(18, True), fill=AZUL, anchor='mm')
    return x, y


atores = {
    'Visitante': ator('Visitante', 175, 230),
    'Adotante': ator('Adotante', 175, 690),
    'ONG': ator('ONG', 1730, 360),
    'Administrador': ator('Administrador', 1730, 900),
}
ligacoes = {
    'Visitante': ['UC01', 'UC03'],
    'Adotante': ['UC03', 'UC04', 'UC05', 'UC06', 'UC07'],
    'ONG': ['UC08', 'UC09', 'UC10', 'UC13'],
    'Administrador': ['UC13', 'UC11', 'UC12', 'UC14', 'UC15'],
}
for a, ucs in ligacoes.items():
    ax, ay = atores[a]
    for u in ucs:
        cx, cy = pos[u]
        if ax < cx:
            d.line(P(ax + 40, ay - 5, cx - LARG / 2, cy), fill=CINZA, width=2 * S)
        else:
            d.line(P(ax - 40, ay - 5, cx + LARG / 2, cy), fill=CINZA, width=2 * S)

# ator genérico embaixo, ligado a UC02
ux, uy = ator('Usuário cadastrado', 950, 1420)
d.line(P(ux, uy - 72, 950, 1210 + ALT / 2), fill=CINZA, width=2 * S)


def generalizacao(pontos):
    """Linha em L até o ator genérico, com triângulo vazado na ponta (herança)."""
    for (x1, y1), (x2, y2) in zip(pontos, pontos[1:], strict=False):
        d.line(P(x1, y1, x2, y2), fill=AZUL, width=2 * S)
    (x1, y1), (x2, y2) = pontos[-2], pontos[-1]
    dx = 1 if x2 > x1 else -1
    d.polygon(P(x2, y2, x2 - dx * 22, y2 - 12, x2 - dx * 22, y2 + 12), outline=AZUL, fill='white', width=2 * S)


generalizacao([(175, 800), (175, 1420), (920, 1420)])     # Adotante
generalizacao([(1730, 1010), (1730, 1420), (980, 1420)])  # Administrador
generalizacao([(1790, 350), (1860, 350), (1860, 1450), (980, 1450)])  # ONG
d.text(P(560, 1440), 'herda de', font=fonte(14), fill=AZUL, anchor='mm')
d.text(P(1350, 1440), 'herdam de', font=fonte(14), fill=AZUL, anchor='mm')


def desenha(texto, cx, cy):
    d.ellipse(P(cx - LARG / 2, cy - ALT / 2, cx + LARG / 2, cy + ALT / 2), fill='#e8eefc', outline='#4f6fb5', width=2 * S)
    cod, _, txt = texto.partition(' ')
    linhas, atual = [], ''
    for p in txt.split():
        if len(atual + ' ' + p) > 32:
            linhas.append(atual)
            atual = p
        else:
            atual = (atual + ' ' + p).strip()
    linhas.append(atual)
    d.text(P(cx, cy - (22 if len(linhas) > 1 else 12)), cod, font=fonte(16, True), fill=AZUL, anchor='mm')
    for i, linha in enumerate(linhas):
        d.text(P(cx, cy + (2 if len(linhas) > 1 else 10) + i * 19), linha, font=fonte(15), fill=TEXTO, anchor='mm')


for t, cx, cy in fila:
    desenha(t, cx, cy)
im = im.resize((W, H), Image.LANCZOS)
im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos_de_uso.png'))
