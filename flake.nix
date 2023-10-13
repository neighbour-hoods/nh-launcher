{
  description = "Template for Holochain app development";

  inputs = {
    versions.url  = "github:holochain/holochain?dir=versions/0_1";

    holochain-flake.url = "github:holochain/holochain?ref=bf1ee455f62b86fb2a6aed2ea071721daea1cbdf";
    holochain-flake.inputs.versions.follows = "versions";
    holochain-flake.inputs.holochain.url = "github:holochain/holochain/holochain-0.2.2";

    nixpkgs.follows = "holochain-flake/nixpkgs";
    flake-parts.follows = "holochain-flake/flake-parts";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
      }
      {
        systems = builtins.attrNames inputs.holochain-flake.devShells;
        perSystem =
          { inputs'
          , config
          , pkgs
          , system
          , ...
          }: {
            devShells.default = pkgs.mkShell {
              inputsFrom = [
                inputs'.holochain-flake.devShells.holonix
              ];
              packages = (with pkgs; [
                # pin client app Node version
                nodejs-18_x
              ])
              # for Tauri compilation
              ++ (pkgs.lib.optionals pkgs.stdenv.isLinux
                (with pkgs; [
                  webkitgtk.dev
                  gdk-pixbuf
                  gtk3
                ]))
              ++ pkgs.lib.optionals pkgs.stdenv.isDarwin
                # :TODO: doesn't like `self`, fix this
                []
                # (with self'.legacyPackages.apple_sdk'.frameworks; [
                #   AppKit
                #   CoreFoundation
                #   CoreServices
                #   Security
                #   IOKit
                #   WebKit
                # ])
              ;
            };
          };
      };
}
