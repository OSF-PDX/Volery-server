# Volery-server SQL scripts

## Installing the database

The scripts in this directory create the PostgreSQL database that the Express endpoints use to manipulate the state of the Volery app. The process is pretty straightforward. To run most of the commands I'll talk about you need to make sure your Linux user has sudo privileges. You can check this by using the `groups` command at the shell prompt. The command will list all the groups you're a member of and one of them should be `sudo`.

1. Make sure Postgres is installed and running. On Ubuntu and similar distributions you can find out what Postgres components you have installed with `apt list --installed "postgres*"`. My system shows this:
    ```    
    postgresql-16/noble-updates,noble-security,now 16.11-0ubuntu0.24.04.1 amd64 [installed,automatic]    
    postgresql-client-16/noble-updates,noble-security,now 16.11-0ubuntu0.24.04.1 amd64 [installed,automatic]
    postgresql-client-common/noble-updates,noble-updates,now 257build1.1 all [installed,automatic]
    postgresql-client/noble-updates,noble-updates,now 16+257build1.1 all [installed]
    postgresql-common/noble-updates,noble-updates,now 257build1.1 all [installed,automatic]
    postgresql/noble-updates,noble-updates,now 16+257build1.1 all [installed]
    ```

    Basically, you just need to make sure you have both the client and server. Here, the server is `postgresql` and the client is `postgresql-client`. The actual client program is called `psql`. It should suffice to do `sudo apt install postgresql` and `sudo apt install postgresql-client`. The other packages are pulled in as dependencies automatically so you don't need to explicitly install them. Installing the server usually starts it but if it doesn't or it has stopped just do `sudo systemctl start postgresql`.

2. Run the script that creates the database in this directory: `sudo psql -U postgres -f init_volery_db.sql`. Note that this will destroy any pre-existing database called `volery_server`.
3. Run the script that populates the tables and functions: `sudo psql -U postgres -d volery_server -f create_tables.sql`.

## Testing

The important functionality is implemented in functions written in Postgres' internal language called plpgsql. To run any of these functions just login to the database with `sudo psql -U postgres -d volery_server`. You can create a Volery user with a function call like `select create_user('greg','Greg','P','mypasswrd');` User accounts are locked when first created so to allow the user to login you first need to do `select unlock('greg');`. The names of the functions are pretty descriptive. Note that locking a user account prevents them from both logging in *and* logging out. The `revoke_session` function will always work to destroy a session however and `logout_all_sessions` destroys all of a user's sessions.