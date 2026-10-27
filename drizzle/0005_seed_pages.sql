-- Pages the site links to at launch. The text is a starting point, edited in the backoffice.
-- /contactos also shows the contact form (see src/routes/(site)/[slug]).
INSERT INTO `page` (`id`, `slug`, `title`, `body`, `show_in_footer`, `status`) VALUES
('page-contactos', 'contactos', 'Contactos',
'<p>Tem uma notícia, uma correção ou uma sugestão? Escreva-nos através do formulário abaixo. Lemos todas as mensagens.</p>',
1, 'published'),

('page-privacidade', 'politica-de-privacidade', 'Política de privacidade',
'<p>O Carapeços Online recolhe o mínimo de dados pessoais necessário para o site funcionar. Esta página explica quais e porquê.</p>
<h2>Comentários</h2>
<p>Quando comenta, guardamos o nome que indicar e o texto do comentário, que ficam públicos junto à notícia. Guardamos também um código derivado do seu endereço IP (não o endereço em si), que serve apenas para travar abusos, como o envio repetido de comentários.</p>
<h2>Sondagens</h2>
<p>As votações são anónimas. Para evitar votos repetidos, o seu navegador guarda um registo das sondagens em que já votou, e guardamos um código derivado do endereço IP e do navegador, nunca o endereço IP.</p>
<h2>Formulário de contacto</h2>
<p>As mensagens enviadas pelo formulário (nome, email e mensagem) ficam guardadas para lhe podermos responder e só são lidas pela equipa do site. Não são partilhadas com terceiros.</p>
<h2>Notificações</h2>
<p>Se ativar as notificações de novas notícias, guardamos o endereço técnico que o seu navegador nos dá para as enviar. Pode desativá-las a qualquer momento nas definições do navegador.</p>
<h2>Estatísticas e cookies</h2>
<p>Usamos o Cloudflare Web Analytics, que não usa cookies nem identifica visitantes. Contamos as visitas a cada notícia para mostrar as mais lidas, sem guardar quem as leu. O site só usa armazenamento no navegador para lembrar o tema escolhido, o nome usado nos comentários e as sondagens em que votou.</p>
<p>A proteção contra robôs nos formulários é feita pelo Cloudflare Turnstile.</p>
<h2>Os seus direitos</h2>
<p>Pode pedir-nos para ver, corrigir ou apagar os seus dados (por exemplo, um comentário) através da página de <a href="/contactos">contactos</a>.</p>',
1, 'published'),

('page-regras', 'regras-dos-comentarios', 'Regras dos comentários',
'<p>Os comentários são publicados de imediato, sem aprovação prévia. Para que continuem a ser um espaço de conversa, pedimos que respeite estas regras:</p>
<ul>
<li><p>Comente a notícia, não as pessoas. Críticas sim, insultos não.</p></li>
<li><p>Não é permitida linguagem ofensiva, discriminatória ou ameaçadora.</p></li>
<li><p>Não publique dados pessoais de terceiros (moradas, telefones, emails).</p></li>
<li><p>Publicidade e ligações repetidas são consideradas spam.</p></li>
<li><p>Não se faça passar por outra pessoa.</p></li>
</ul>
<p>Os comentários que não cumpram estas regras podem ser ocultados ou apagados pela equipa do site. Se vir um comentário que as viola, use o botão <strong>Reportar</strong>.</p>',
1, 'published');
