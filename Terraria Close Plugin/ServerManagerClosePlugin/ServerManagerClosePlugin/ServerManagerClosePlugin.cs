using Terraria;
using System;
using System.Net;
using System.Threading.Tasks;
using TShockAPI;
using TerrariaApi.Server;
using System.Diagnostics;

namespace ServerManagerClosePlugin
{
    [ApiVersion(2, 1)]
    public class ServerManagerClosePlugin : TerrariaPlugin
    {
        private HttpListener _httpListener;

        public override string Name => "ServerManagerClosePlugin";
        public override Version Version => new Version(1, 4, 4, 9);
        public override string Author => "Sandelier";
        public override string Description => "Plugin to close terraria when close request is thrown into my server manager.";

        public ServerManagerClosePlugin(Main game) : base(game)
        {
        }

        public override void Initialize()
        {
            _httpListener = new HttpListener();
            _httpListener.Prefixes.Add("http://localhost:53267/Terraria/CommandExecution/");
            _httpListener.Start();

            Task.Run(() => HandleRequests());
        }

        private async Task HandleRequests()
        {
            while (_httpListener.IsListening)
            {
                try
                {
                    HttpListenerContext context = await _httpListener.GetContextAsync();

                    if (context.Request.HttpMethod == "POST" && context.Request.Url.AbsolutePath == "/Terraria/CommandExecution")
                    {
                        string content;
                        using (var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding))
                        {
                            content = await reader.ReadToEndAsync();
                        }

                        string command = content.Trim();


                        if (!command.StartsWith("/"))
                        {
                            command = "/" + command;
                        }

                        TShockAPI.Commands.HandleCommand(TSPlayer.Server, command);

                        context.Response.StatusCode = (int)HttpStatusCode.OK;
                    }
                    else
                    {
                        context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                    }

                    context.Response.Close();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error handling request: {ex.Message}");
                }
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _httpListener?.Stop();
                _httpListener?.Close();
            }
            base.Dispose(disposing);
        }
    }
}