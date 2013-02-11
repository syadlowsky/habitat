require 'rubygems'
require 'httparty'
require 'mongo'
require 'uri'

include Mongo

@client = MongoClient.from_uri(ENV['TMPMONGOHQ_URL']) #MongoClient.new('localhost', 27017)
@db_name = @client.auths[0]["db_name"]
@db = @client[@db_name]
@coll = @db['hacks']

i = 0

@coll.find.skip(80).each do |hack|
  i = i + 1
  puts "#{i}..."
  if not hack["picture"].empty? 
    if hack["picture"] =~ URI::regexp
      begin
      httpartyresponse = HTTParty.get(hack["picture"])
      rescue SocketError => e
        puts "Not a valid URI (#{hack["picture"]}): #{hack["_id"]}\nDelete?"
        valid = gets
        if valid=="D\n"
          @coll.update({"_id"=>hack["_id"]}, {"$set" => {"picture"=>""}})
        end
      end
      if httpartyresponse.response.code.to_i >= 400
        puts "Page (#{hack["picture"]}) seems to respond with a #{httpartyresponse.response.code} code: #{hack["_id"]}\nDelete?"
        valid = gets
        if valid=="D\n"
          @coll.update({"_id"=>hack["_id"]}, {"$set" => {"picture"=>""}})
        end
      elsif not (httpartyresponse.headers["content-type"] =~ /image/)
        puts "I don't think this is an image. It\'s content-type is #{httpartyresponse.headers["content-type"]}: #{hack["_id"]} and url is (#{hack["picture"]})\nDelete?"
        valid = gets
        if valid=="D\n"
          @coll.update({"_id"=>hack["_id"]}, {"$set" => {"picture"=>""}})
        end
      end
    else
      puts "Not a valid URI (#{hack["picture"]}): #{hack["_id"]}\nDelete?"
      valid = gets
      if valid=="D\n"
        @coll.update({"_id"=>hack["_id"]}, {"$set" => {"picture"=>""}})
      end
    end
  end
end
